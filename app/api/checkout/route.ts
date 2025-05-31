import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { items, cartItems } = await request.json()

    await connectDB()

    // Calculate totals
    let subtotal = 0
    const orderItems = []

    for (const cartItem of cartItems) {
      const product = await Product.findById(cartItem._id)
      if (!product) {
        return NextResponse.json({ error: `Product ${cartItem.name} not found` }, { status: 404 })
      }

      if (product.stock < cartItem.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`
        }, { status: 400 })
      }

      // Calculate the actual price to charge
      let actualPrice = product.price

      if (product.saleConfig?.isOnSale) {
        if (product.saleConfig.saleType === 'percentage') {
          actualPrice = product.price * (1 - product.saleConfig.saleValue / 100)
        } else if (product.saleConfig.saleType === 'amount') {
          actualPrice = product.price - product.saleConfig.saleValue
        }
        actualPrice = Math.max(0, actualPrice)
      }

      const itemTotal = actualPrice * cartItem.quantity
      subtotal += itemTotal

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: actualPrice,
        quantity: cartItem.quantity,
        size: cartItem.size,
        color: cartItem.color,
        image: product.images[0] || '',
      })
    }

    // Calculate shipping (free over $100)
    const shippingCost = subtotal >= 100 ? 0 : 9.99
    const tax = subtotal * 0.08
    const total = subtotal + shippingCost + tax

    // Create order in database first
    const order = new Order({
      userId,
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'pending',
    })

    await order.save()

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items,
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${request.headers.get('origin')}/cart`,
      metadata: {
        userId,
        orderId: order._id.toString(),
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      billing_address_collection: 'required',
    })

    // Update order with stripe session ID
    order.stripeSessionId = session.id
    await order.save()

    return NextResponse.json({ sessionUrl: session.url, orderId: order._id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
