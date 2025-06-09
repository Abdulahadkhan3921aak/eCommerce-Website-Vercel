import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import connectDB from '@/lib/mongodb'
import Product from '@/lib/models/Product' // Fixed import path
import Order from '@/lib/models/Order'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { items, cartItems, shippingAddress, selectedShippingRate } = await request.json()

    await connectDB()

    // Calculate totals
    let subtotal = 0
    const orderItems = []

    for (const cartItem of cartItems) {
      const product = await Product.findById(cartItem.productId || cartItem._id) // Use productId or _id
      if (!product) {
        return NextResponse.json({ error: `Product ${cartItem.name} not found` }, { status: 404 })
      }

      if (product.stock < cartItem.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`
        }, { status: 400 })
      }

      // Use effectivePrice from cartItem which should already consider sales
      const actualPrice = cartItem.effectivePrice;


      const itemTotal = actualPrice * cartItem.quantity
      subtotal += itemTotal

      orderItems.push({
        productId: product._id,
        unitId: cartItem.unitId, // Ensure unitId is passed from cart
        name: cartItem.name, // Use name from cartItem as it might include variant info
        price: actualPrice, // Store the price paid
        quantity: cartItem.quantity,
        size: cartItem.size,
        color: cartItem.color,
        image: (cartItem.images && cartItem.images.length > 0 ? cartItem.images[0] : product.images[0]) || "/placeholder-image.png",
      })
    }

    // Calculate shipping using selected rate
    // const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || "100");
    // const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD; // This logic is now handled in /api/shipping/rates

    let shippingCost = 0;
    let shippoShipmentDetails = undefined;

    if (selectedShippingRate) {
      shippingCost = selectedShippingRate.cost; // This cost already considers free shipping
      shippoShipmentDetails = {
        rateId: selectedShippingRate.rateId,
        carrier: selectedShippingRate.provider,
        serviceLevelToken: selectedShippingRate.serviceType,
        serviceLevelName: selectedShippingRate.serviceName,
        cost: shippingCost, // Store the final cost applied
        estimatedDeliveryDays: selectedShippingRate.deliveryDays,
        // trackingNumber and labelUrl will be added upon approval/label creation
      };
    }

    const actualShippingCost = shippingCost;

    // Tax calculation: Consider if tax should be on (subtotal + original shipping cost)
    // For simplicity, let's assume tax is on subtotal only, or subtotal + displayed shipping.
    // If shipping is free, tax is on subtotal. If shipping has a cost, tax is on subtotal + shipping.
    // This can get complex depending on local tax laws (e.g., is shipping taxable?).
    // Current: Tax on subtotal + final shipping cost.
    const taxRate = 0.08; // Example tax rate.
    const taxableAmount = subtotal + actualShippingCost;
    const tax = taxableAmount * taxRate;
    const total = subtotal + actualShippingCost + tax;

    // Create order in database first with pending admin approval
    const order = new Order({
      userId,
      items: orderItems,
      subtotal,
      shippingCost: actualShippingCost,
      tax,
      total,
      status: 'pending_approval', // Initial status
      paymentStatus: 'pending_approval', // Initial payment status
      shippingAddress: {
        name: shippingAddress.name,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postal_code: shippingAddress.postalCode,
        country: shippingAddress.country || 'US', // Ensure US, or validate if other countries allowed
        phone: shippingAddress.phone,
        email: shippingAddress.email,
        residential: shippingAddress.residential,
      },
      billingAddress: { // Placeholder: Stripe will collect billing address.
        // We can update this later via webhook or after payment success if needed.
        name: shippingAddress.name, // Default to shipping, can be updated
        line1: '', // Stripe will collect
        city: '',
        state: '',
        postal_code: '',
        country: '',
      },
      shippingMethod: selectedShippingRate ? selectedShippingRate.serviceName : 'Not selected',
      customerEmail: user.emailAddresses[0]?.emailAddress || shippingAddress.email,
      customerPhone: shippingAddress.phone || user.phoneNumbers[0]?.phoneNumber || '',
      paymentMethod: 'stripe', // Default or derive from session.payment_method_types if possible later
      shippoShipment: shippoShipmentDetails,
      emailHistory: [],
      // shippingWeight, shippingDimensions, isPriceAdjusted, originalOrderId are not set at initial checkout
    });

    await order.save()

    // Create a payment intent with manual confirmation (delayed payment)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Amount in cents
      currency: 'usd',
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      capture_method: 'manual', // This creates a delayed payment
      metadata: {
        userId,
        orderId: order._id.toString(),
        customerEmail: user.emailAddresses[0]?.emailAddress || '',
      },
      description: `Order ${order.orderNumber}`,
    })

    // Create the checkout session with the payment intent
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Consider adding 'link', 'afterpay_clearpay', etc.
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id.toString()}`,
      cancel_url: `${request.headers.get('origin')}/cart?checkout_cancelled=true`,
      line_items: items, // These are the Stripe line items passed from the cart page
      metadata: {
        userId,
        orderId: order._id.toString(),
      },
      customer_email: order.customerEmail, // Use email stored in order
      billing_address_collection: 'required', // Collect billing address on Stripe page
      shipping_options: [], // We are handling shipping rates
      card: {
        request_three_d_secure: 'automatic',
      },
    },
    )

    // Update order with stripe session and payment intent IDs
    order.stripeSessionId = session.id
    order.stripePaymentIntentId = paymentIntent.id
    await order.save()

    // TODO: Send email notification to admin about new order pending approval

    return NextResponse.json({
      sessionUrl: session.url,
      orderId: order._id,
      paymentIntentId: paymentIntent.id
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
