import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import { extractCustomerEmail } from '@/utils/email-collection'
import { logPaymentSuccessEmail } from '@/utils/email-collection'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
    try {
        const { sessionId, orderId, paymentIntentId } = await request.json()

        if (!sessionId || !orderId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        await dbConnect()

        // Retrieve the Stripe session first
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
        }

        // Get the order from database
        const order = await Order.findById(orderId)

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // For payment verification, we'll validate against the Stripe session instead of just user ID
        // This handles both authenticated users and guest checkout scenarios
        const { userId } = await auth()

        // Check if this is a valid payment session for this order
        // Either the user matches OR this is a guest checkout with valid session
        const isAuthorizedAccess = (
            (userId && order.userId === userId) || // Authenticated user owns order
            (!order.userId && session.client_reference_id === orderId) || // Guest checkout with matching reference
            (session.metadata?.orderId === orderId) // Session metadata matches order
        )

        if (!isAuthorizedAccess) {
            console.error('Unauthorized access attempt:', {
                userId,
                orderUserId: order.userId,
                sessionClientRef: session.client_reference_id,
                sessionMetadata: session.metadata,
                orderId
            })
            return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 })
        }

        // Get payment intent details for transaction ID
        let transactionId = sessionId
        if (session.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(
                typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
            )
            transactionId = paymentIntent.id
        }

        // Update order status if payment is successful
        if (order.paymentStatus !== 'captured' && order.status !== 'processing') {
            // Update inventory - reduce stock for each item
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { stock: -item.quantity } },
                    { new: true }
                )
            }

            // Update order status
            order.status = 'processing'
            order.paymentStatus = 'captured'
            order.transactionId = transactionId
            order.stripeSessionId = sessionId

            // Add payment success email to history
            const user = await currentUser()
            const customerEmail = extractCustomerEmail(user) || order.customerEmail

            if (customerEmail) {
                // Log payment success email
                logPaymentSuccessEmail(order, transactionId, 'system')

                order.emailHistory.push({
                    sentBy: 'system',
                    type: 'payment_success',
                    subject: `Payment Successful - Order ${order.orderNumber} Confirmed!`,
                    content: `Your payment has been successfully processed. Transaction ID: ${transactionId}. Your order is now being prepared for shipment.`,
                    sentAt: new Date()
                })
            }

            await order.save()
        }

        return NextResponse.json({
            success: true,
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                items: order.items,
                subtotal: order.subtotal,
                shippingCost: order.shippingCost,
                tax: order.tax,
                total: order.total,
                status: order.status,
                paymentStatus: order.paymentStatus,
                createdAt: order.createdAt,
                transactionId: order.transactionId,
                shippingAddress: order.shippingAddress,
                shippoShipment: order.shippoShipment
            }
        })
    } catch (error) {
        console.error('Error verifying payment success:', error)
        return NextResponse.json({
            error: 'Failed to verify payment',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
