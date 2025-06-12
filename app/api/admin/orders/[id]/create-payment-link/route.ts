import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import { generateJWTToken } from '@/lib/utils/tokenUtils'
import EmailService from '@/lib/services/emailService'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const resolvedParams = await params
        const orderId = resolvedParams.id
        const { sendEmail = true } = await request.json()

        await dbConnect()

        const order = await Order.findById(orderId).populate('items.productId', 'name images')
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Check if order is in correct status for payment link generation
        if (!['approved', 'pending_payment_adjustment', 'shipping_calculated'].includes(order.status)) {
            return NextResponse.json({
                error: `Cannot generate payment link for order with status: ${order.status}`
            }, { status: 400 })
        }

        // Generate secure JWT token with 7-day expiry
        const paymentToken = generateJWTToken(orderId, '7d')
        const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        // Update order with payment token
        order.paymentToken = paymentToken
        order.paymentTokenExpiry = expiryDate
        order.updatedAt = new Date()

        // Create payment link
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'
        const paymentLink = `${baseUrl}/payment/${orderId}?token=${paymentToken}`

        // Add to email history
        order.emailHistory.push({
            sentBy: userId,
            type: 'payment_link_generated',
            subject: `Payment link generated for order ${order.orderNumber}`,
            content: `Payment link created and ${sendEmail ? 'sent to customer' : 'generated (not sent)'}. Link expires: ${expiryDate.toLocaleString()}`,
            sentAt: new Date(),
        })

        await order.save()

        // Send email if requested
        let emailSent = false
        if (sendEmail) {
            try {
                const shippingInfo = order.shippoShipment ? {
                    cost: order.shippingCost || 0,
                    estimatedDays: order.shippoShipment.estimatedDeliveryDays,
                    serviceName: order.shippoShipment.serviceLevelName,
                    carrier: order.shippoShipment.carrier
                } : undefined

                emailSent = await EmailService.sendPaymentLinkEmail({
                    orderNumber: order.orderNumber,
                    customerName: order.shippingAddress.name,
                    customerEmail: order.customerEmail,
                    items: order.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        size: item.size,
                        color: item.color
                    })),
                    subtotal: order.subtotal,
                    shippingInfo,
                    tax: order.tax || 0,
                    total: order.total,
                    paymentLink,
                    expiryDate
                })

                if (emailSent) {
                    // Update email history to reflect successful sending
                    order.emailHistory[order.emailHistory.length - 1].content += ' - Email sent successfully'
                    await order.save()
                }
            } catch (emailError) {
                console.error('Failed to send payment link email:', emailError)
                // Don't fail the request if email fails, just log it
            }
        }

        return NextResponse.json({
            success: true,
            paymentToken,
            paymentLink,
            expiryDate,
            emailSent,
            message: sendEmail
                ? (emailSent ? 'Payment link created and sent to customer' : 'Payment link created but email failed to send')
                : 'Payment link created successfully'
        })

    } catch (error) {
        console.error('Error creating payment link:', error)
        return NextResponse.json({
            error: 'Failed to create payment link',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
