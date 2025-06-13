import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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

        const { confirmation, adminNotes } = await request.json()
        const orderId = resolvedParams.id

        // Require exact confirmation text
        if (confirmation !== 'remove') {
            return NextResponse.json({ error: 'Invalid confirmation. Type "remove" to confirm.' }, { status: 400 })
        }

        await dbConnect()

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Cancel any Stripe payment intents
        if (order.stripePaymentIntentId) {
            try {
                await stripe.paymentIntents.cancel(order.stripePaymentIntentId)
            } catch (stripeError) {
                console.error('Failed to cancel Stripe payment intent:', stripeError)
            }
        }

        // Remove the order completely
        await Order.findByIdAndDelete(orderId)

        // TODO: Send removal notification email to customer
        // Example: await sendOrderRemovalEmail(order.customerEmail, order.orderNumber)

        return NextResponse.json({
            success: true,
            message: 'Order removed successfully'
        })
    } catch (error) {
        console.error('Error removing order:', error)
        return NextResponse.json({
            error: 'Failed to remove order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
