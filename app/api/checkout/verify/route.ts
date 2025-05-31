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

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
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

    // Update order status if payment is successful
    if (order.paymentStatus !== 'completed') {
      order.paymentStatus = 'completed'
      order.status = 'confirmed'
      order.stripePaymentIntentId = session.payment_intent

      // Add shipping address from Stripe session
      if (session.shipping_details) {
        order.shippingAddress = {
          name: session.shipping_details.name,
          address: {
            line1: session.shipping_details.address.line1,
            line2: session.shipping_details.address.line2,
            city: session.shipping_details.address.city,
            state: session.shipping_details.address.state,
            postal_code: session.shipping_details.address.postal_code,
            country: session.shipping_details.address.country,
          }
        }
      }

      // Reduce product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.quantity } },
          { new: true }
        )
      }

      await order.save()

      // TODO: Send confirmation email
      // TODO: Create UPS shipment
      // TODO: Trigger Inngest events
    }

    return NextResponse.json({ 
      success: true, 
      order: {
        _id: order._id,
        items: order.items,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        tax: order.tax,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      }
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({
      error: 'Failed to verify payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
