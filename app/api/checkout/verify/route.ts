import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, orderId } = await request.json()

    if (!sessionId || !orderId) {
      return NextResponse.json({ error: 'Missing session ID or order ID' }, { status: 400 })
    }

    await dbConnect()

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Check if payment_intent is a string, if so, retrieve it.
    let paymentIntentId: string | null = null;
    if (typeof session.payment_intent === 'string') {
      paymentIntentId = session.payment_intent;
    } else if (session.payment_intent && typeof session.payment_intent === 'object') {
      paymentIntentId = session.payment_intent.id;
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent not found in session' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // For delayed capture, status might be 'requires_capture' after checkout success.
    // We are primarily concerned that the payment method is set up.
    // The actual 'paid' status (succeeded for payment intent) will happen after admin captures.
    if (paymentIntent.status !== 'requires_capture' && paymentIntent.status !== 'succeeded') {
      // If it already succeeded, it means it might have been captured elsewhere or it's not manual.
      // If it's not requires_capture, something is wrong for manual flow.
      console.warn(`Payment intent status is ${paymentIntent.status}, expected 'requires_capture' or 'succeeded'. OrderId: ${orderId}`);
      // Allow 'succeeded' if somehow it got captured early or if it's not a manual capture PI.
      // The critical check is that it's not 'failed' or 'canceled'.
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json({ error: 'Payment not ready for capture or failed' }, { status: 400 })
      }
    }


    // Get the order from database
    const order = await Order.findById(orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Verify the order belongs to the user
    if (order.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to order' }, { status: 403 })
    }

    // Update order status if payment setup is successful
    // The status 'pending_approval' is already set. Payment status is also 'pending_approval'.
    // We are just confirming the Stripe session was successful and PI is ready.
    if (order.paymentStatus === 'pending_approval') {
      // No change to order.status or order.paymentStatus here.
      // These will be updated upon admin approval and payment capture.
      order.stripePaymentIntentId = paymentIntentId; // Ensure it's stored
      order.stripeSessionId = sessionId; // Ensure it's stored

      // Add shipping address from Stripe session if it was collected there and not already on order
      if (session.shipping_details && session.shipping_details.address && !order.shippingAddress.line1) {
        order.shippingAddress = {
          name: session.shipping_details.name || order.shippingAddress.name,
          line1: session.shipping_details.address.line1 || order.shippingAddress.line1,
          line2: session.shipping_details.address.line2 || order.shippingAddress.line2,
          city: session.shipping_details.address.city || order.shippingAddress.city,
          state: session.shipping_details.address.state || order.shippingAddress.state,
          postal_code: session.shipping_details.address.postal_code || order.shippingAddress.postal_code,
          country: session.shipping_details.address.country || order.shippingAddress.country,
        };
      }

      // Billing address from Stripe if collected
      if (session.customer_details && session.customer_details.address && !order.billingAddress.line1) {
        order.billingAddress = {
          name: session.customer_details.name || order.billingAddress.name || session.shipping_details?.name,
          line1: session.customer_details.address.line1 || order.billingAddress.line1,
          line2: session.customer_details.address.line2 || order.billingAddress.line2,
          city: session.customer_details.address.city || order.billingAddress.city,
          state: session.customer_details.address.state || order.billingAddress.state,
          postal_code: session.customer_details.address.postal_code || order.billingAddress.postal_code,
          country: session.customer_details.address.country || order.billingAddress.country,
        };
      }


      // Stock reduction and label creation are moved to admin approval.
      // No FedEx/Shippo label creation here.

      await order.save()

      // TODO: Send "Order Received, Pending Approval" email to customer
      // TODO: Trigger Inngest events for "order received"
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
        status: order.status, // Will be 'pending_approval'
        paymentStatus: order.paymentStatus, // Will be 'pending_approval'
        createdAt: order.createdAt,
      }
    })
  } catch (error) {
    console.error('Error verifying payment session:', error)
    return NextResponse.json({
      error: 'Failed to verify payment session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
