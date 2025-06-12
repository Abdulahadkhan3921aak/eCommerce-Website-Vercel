import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const user = await currentUser()
        // Enhanced email collection - try multiple sources
        const customerEmail = user?.emailAddresses?.[0]?.emailAddress ||
            user?.primaryEmailAddress?.emailAddress ||
            user?.emailAddresses?.find(email => email.verification?.status === 'verified')?.emailAddress

        if (!customerEmail) {
            return NextResponse.json({
                error: 'Customer email is required for order processing. Please ensure your email is verified.'
            }, { status: 400 })
        }

        const orderData = await request.json()

        // Validate required fields including email
        if (!orderData.items || !orderData.shippingAddress || !orderData.total) {
            return NextResponse.json({
                error: 'Missing required fields: items, shippingAddress, and total are required'
            }, { status: 400 })
        }

        // Ensure customer email is always included in shipping address
        const mappedShippingAddress = {
            name: orderData.shippingAddress.name,
            line1: orderData.shippingAddress.line1,
            line2: orderData.shippingAddress.line2 || '',
            city: orderData.shippingAddress.city,
            state: orderData.shippingAddress.state,
            postal_code: orderData.shippingAddress.postalCode,
            country: orderData.shippingAddress.country || 'US',
            phone: orderData.shippingAddress.phone || '',
            email: customerEmail, // Always use authenticated user's email
        }

        const newOrder = {
            userId,
            items: orderData.items,
            subtotal: orderData.subtotal,
            shippingCost: orderData.shippingCost || 0,
            tax: orderData.tax || 0,
            total: orderData.total,
            status: 'pending',
            paymentStatus: orderData.paymentStatus || 'pending',
            paymentIntentId: orderData.paymentIntentId,
            shippingAddress: mappedShippingAddress,
            billingAddress: orderData.billingAddress || mappedShippingAddress,
            shippingMethod: orderData.shippingMethod || 'standard',
            customerEmail, // Ensure email is always included at order level
            customerPhone: orderData.shippingAddress.phone || user?.phoneNumbers?.[0]?.phoneNumber || '',
            emailHistory: [{
                sentAt: new Date(),
                sentBy: 'system',
                type: 'confirmation',
                subject: 'Order Confirmation',
                content: `Thank you for your order! We have received your order and will process it shortly.

Order Total: $${orderData.total}
Shipping Address: ${mappedShippingAddress.name}, ${mappedShippingAddress.line1}, ${mappedShippingAddress.city}, ${mappedShippingAddress.state} ${mappedShippingAddress.postal_code}

We will send you tracking information once your order ships.`
            }]
        }

        const savedOrder = await Order.create(newOrder)

        return NextResponse.json({
            success: true,
            orderId: savedOrder._id,
            orderNumber: savedOrder.orderNumber,
            customerEmail // Include in response for confirmation
        })

    } catch (error) {
        console.error('Error creating order:', error)
        return NextResponse.json({
            error: 'Failed to create order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
