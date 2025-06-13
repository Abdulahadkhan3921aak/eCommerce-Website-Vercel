import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order, { IOrder } from '@/lib/models/Order' // Import IOrder
import { logOrderAcceptedEmail } from '@/utils/email-collection'; // Import email utility

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth()
        const user = await currentUser()
        const resolvedParams = await params

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Handle optional JSON body
        let adminNotes = ''
        try {
            const body = await request.text()
            if (body) {
                const parsed = JSON.parse(body)
                adminNotes = parsed.adminNotes || ''
            }
        } catch (error) {
            // If no valid JSON, use empty string for adminNotes
            adminNotes = ''
        }

        const orderId = resolvedParams.id

        await dbConnect()

        const order = await Order.findById(orderId) as IOrder | null; // Cast to IOrder
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (order.status !== 'pending_approval') {
            return NextResponse.json({ error: `Order is not pending approval. Current status: ${order.status}` }, { status: 400 })
        }

        // Update order status
        order.status = 'accepted'
        // Ensure paymentStatus reflects that payment is now expected if not already handled
        if (order.paymentStatus === 'pending_approval') {
            order.paymentStatus = 'pending_payment';
        }
        order.adminApproval = {
            ...order.adminApproval,
            isApproved: true, // Retain this for historical/logical approval tracking
            approvedBy: userId,
            approvedAt: new Date(),
            adminNotes: adminNotes || order.adminApproval?.adminNotes || ''
        }

        // Log "Order Accepted" email
        const emailData = logOrderAcceptedEmail(order, userId);

        // Store email details in order history
        order.emailHistory.push({
            sentBy: userId,
            subject: emailData.subject,
            content: `Order acceptance email generated. HTML email with order details sent to ${emailData.to}`,
            type: 'order_accepted',
            sentAt: new Date()
        })

        console.log('📧 Email Data Generated:', {
            to: emailData.to,
            subject: emailData.subject,
            hasHtml: !!emailData.html,
            hasText: !!emailData.text
        })

        // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
        // await emailService.send(emailData)

        await order.save()

        return NextResponse.json({
            success: true,
            message: 'Order accepted successfully. Customer email generated and logged.',
            order: order,
            emailGenerated: {
                to: emailData.to,
                subject: emailData.subject,
                status: 'generated' // Change to 'sent' when email service is integrated
            }
        })
    } catch (error) {
        console.error('Error accepting order:', error)
        return NextResponse.json({
            error: 'Failed to accept order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
