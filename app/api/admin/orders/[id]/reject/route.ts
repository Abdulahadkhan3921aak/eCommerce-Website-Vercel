import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { rejectionReason, adminNotes } = await request.json()
        const orderId = params.id

        await dbConnect()

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (order.status !== 'pending_approval') {
            return NextResponse.json({ error: 'Order is not pending approval' }, { status: 400 })
        }

        // Cancel the payment intent
        if (order.stripePaymentIntentId) {
            await stripe.paymentIntents.cancel(order.stripePaymentIntentId)
        }

        // Update order
        order.status = 'rejected'
        order.paymentStatus = 'cancelled'
        order.adminApproval = {
            isApproved: false,
            rejectedBy: userId,
            rejectedAt: new Date(),
            rejectionReason: rejectionReason || 'Order rejected by admin',
            adminNotes: adminNotes || order.adminApproval?.adminNotes || '' // Preserve existing notes if any
        }

        // Add email to history
        order.emailHistory.push({
            sentBy: userId,
            subject: 'Order Rejected',
            content: `Your order ${order.orderNumber} has been rejected. Reason: ${rejectionReason}`,
            type: 'rejection'
        })

        await order.save()

        // TODO: Send rejection email to customer

        return NextResponse.json({
            success: true,
            order: order
        })
    } catch (error) {
        console.error('Error rejecting order:', error)
        return NextResponse.json({
            error: 'Failed to reject order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
