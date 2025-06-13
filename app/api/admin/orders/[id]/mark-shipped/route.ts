import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order, { IOrder } from '@/lib/models/Order'
import { logOrderShippedEmail } from '@/utils/email-collection'

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

        const orderId = resolvedParams.id

        await dbConnect()

        const order = await Order.findById(orderId) as IOrder | null
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Validate order can be marked as shipped
        if (order.status !== 'processing') {
            return NextResponse.json({
                error: `Order must be in 'processing' status to mark as shipped. Current status: ${order.status}`
            }, { status: 400 })
        }

        if (order.paymentStatus !== 'captured') {
            return NextResponse.json({
                error: `Payment must be captured before shipping. Current payment status: ${order.paymentStatus}`
            }, { status: 400 })
        }

        if (!order.shippoShipment?.labelUrl || !order.shippoShipment?.trackingNumber) {
            return NextResponse.json({
                error: 'Shipping label and tracking number are required before marking as shipped'
            }, { status: 400 })
        }

        // Update order status
        order.status = 'shipped'

        // Log email with shipping details
        logOrderShippedEmail(order, userId)

        // Add to email history
        order.emailHistory = order.emailHistory || []
        order.emailHistory.push({
            sentBy: userId,
            type: 'order_shipped',
            subject: `Order ${order.orderNumber} Shipped`,
            content: `Order has been marked as shipped. Tracking: ${order.shippoShipment.trackingNumber}. Customer notified via email.`,
            sentAt: new Date(),
        })

        await order.save()

        return NextResponse.json({
            success: true,
            message: 'Order marked as shipped and customer notified successfully!',
            order: order
        })

    } catch (error) {
        console.error('Error marking order as shipped:', error)
        return NextResponse.json({
            error: 'Failed to mark order as shipped',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
