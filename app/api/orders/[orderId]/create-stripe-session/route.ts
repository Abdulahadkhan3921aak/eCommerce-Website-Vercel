import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(
    request: NextRequest,
    { params }: { params: { orderId: string } }
) {
    try {
        const { token } = await request.json()
        const { orderId } = params

        if (!token) {
            return NextResponse.json(
                { error: 'Payment token is required' },
                { status: 400 }
            )
        }

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required' },
                { status: 400 }
            )
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Look up order by orderId and verify paymentToken
        const order = await db.collection('orders').findOne({
            _id: new ObjectId(orderId),
            paymentToken: token
        })

        if (!order) {
            return NextResponse.json(
                { error: 'Invalid token or order not found' },
                { status: 401 }
            )
        }

        // Check if order is in a valid state for payment
        if (!['approved', 'pending_payment_adjustment'].includes(order.status)) {
            return NextResponse.json(
                { error: 'Order is not ready for payment' },
                { status: 400 }
            )
        }

        // Check if payment link is still valid
        if (order.paymentLinkExpiresAt && new Date() > new Date(order.paymentLinkExpiresAt)) {
            return NextResponse.json(
                { error: 'Payment link has expired' },
                { status: 400 }
            )
        }

        // Create Stripe line items from order items
        const lineItems = order.items.map((item: any) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    images: item.image ? [item.image] : [],
                    metadata: {
                        productId: item.productId || '',
                        unitId: item.unitId || '',
                        size: item.size || '',
                        color: item.color || ''
                    }
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity,
        }))

        // Add shipping as a line item if there's a shipping cost
        if (order.shippingCost && order.shippingCost > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Shipping - ${order.shippoShipment?.serviceLevelName || 'Standard'}`,
                        metadata: {
                            type: 'shipping',
                            carrier: order.shippoShipment?.carrier || '',
                            trackingNumber: order.shippoShipment?.trackingNumber || ''
                        }
                    },
                    unit_amount: Math.round(order.shippingCost * 100), // Convert to cents
                },
                quantity: 1,
            })
        }

        // Add tax as a line item if there's tax
        if (order.tax && order.tax > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Tax',
                        metadata: {
                            type: 'tax'
                        }
                    },
                    unit_amount: Math.round(order.tax * 100), // Convert to cents
                },
                quantity: 1,
            })
        }

        // Create the checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            success_url: `${request.headers.get('origin')}/orders/${order.orderNumber}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get('origin')}/orders/${order.orderNumber}/payment-cancelled`,
            customer_email: order.customerEmail,
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US', 'CA'] // Adjust based on your shipping regions
            },
            metadata: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                paymentToken: token,
                originalTotal: order.total.toString()
            },
            expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
            automatic_tax: {
                enabled: false // We're handling tax manually
            },
            payment_intent_data: {
                metadata: {
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    customerEmail: order.customerEmail
                },
                description: `Payment for order ${order.orderNumber}`,
                receipt_email: order.customerEmail
            }
        })

        // Update order with Stripe session info
        await db.collection('orders').updateOne(
            { _id: new ObjectId(orderId) },
            {
                $set: {
                    stripeSessionId: session.id,
                    paymentLinkLastUsed: new Date(),
                    updatedAt: new Date()
                },
                $push: {
                    emailHistory: {
                        sentBy: 'system',
                        type: 'payment_session_created',
                        subject: 'Payment session initiated',
                        content: `Customer initiated payment for order ${order.orderNumber}. Stripe session: ${session.id}`,
                        sentAt: new Date()
                    }
                }
            }
        )

        return NextResponse.json({
            success: true,
            sessionUrl: session.url,
            sessionId: session.id,
            expiresAt: new Date(session.expires_at * 1000).toISOString()
        })

    } catch (error) {
        console.error('Error creating Stripe session:', error)

        if (error instanceof Stripe.errors.StripeError) {
            return NextResponse.json(
                { error: `Stripe error: ${error.message}` },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
