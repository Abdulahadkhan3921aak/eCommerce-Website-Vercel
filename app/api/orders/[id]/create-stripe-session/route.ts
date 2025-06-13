import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Helper function to validate and convert image URLs
const getValidImageUrl = (imageUrl: string | undefined, request: NextRequest): string[] => {
    if (!imageUrl) return []

    try {
        // If it's already a valid absolute URL, use it
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            new URL(imageUrl) // Validate the URL
            return [imageUrl]
        }

        // Convert relative URLs to absolute URLs
        if (imageUrl.startsWith('/')) {
            const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://butterflies-beading.vercel.app'
            const absoluteUrl = `${origin}${imageUrl}`
            new URL(absoluteUrl) // Validate the URL
            return [absoluteUrl]
        }

        // If it's a relative path without leading slash
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://butterflies-beading.vercel.app'
        const absoluteUrl = `${origin}/${imageUrl}`
        new URL(absoluteUrl) // Validate the URL
        return [absoluteUrl]
    } catch (error) {
        console.warn('Invalid image URL:', imageUrl, error)
        return [] // Return empty array for invalid URLs
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params
        const orderId = resolvedParams.id
        const { token } = await request.json()

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 })
        }

        await dbConnect()

        const order = await Order.findById(orderId)
            .populate('items.productId', 'name images')

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Verify payment token
        if (!order.paymentToken || order.paymentToken !== token) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        // Check if token has expired
        if (order.paymentTokenExpiry && new Date() > order.paymentTokenExpiry) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 401 })
        }

        // Check if order can be paid
        if (!['accepted', 'pending_payment', 'pending_payment_adjustment'].includes(order.status)) {
            return NextResponse.json({ error: 'Order is not available for payment' }, { status: 400 })
        }

        // Create line items for Stripe with validated image URLs
        const lineItems = order.items.map((item: any) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    images: getValidImageUrl(item.image, request),
                    metadata: {
                        productId: item.productId?.toString() || '',
                        size: item.size || '',
                        color: item.color || ''
                    }
                },
                unit_amount: Math.round(item.price * 100) // Convert to cents
            },
            quantity: item.quantity
        }))

        // Add shipping as a line item if applicable
        if (order.shippingCost > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Shipping',
                        description: order.shippoShipment?.serviceLevelName || 'Standard Shipping'
                    },
                    unit_amount: Math.round(order.shippingCost * 100)
                },
                quantity: 1
            })
        }

        // Add tax as a line item if applicable
        if (order.tax > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Tax'
                    },
                    unit_amount: Math.round(order.tax * 100)
                },
                quantity: 1
            })
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            success_url: `${request.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
            cancel_url: `${request.headers.get('origin')}/payment/${orderId}?token=${token}&cancelled=true`,
            metadata: {
                orderId: orderId,
                paymentToken: token
            },
            customer_email: order.customerEmail,
            billing_address_collection: 'required',
            shipping_address_collection: {
                allowed_countries: ['US']
            }
        })

        // Update order with session ID
        order.stripeSessionId = session.id
        order.paymentStatus = 'pending_payment'
        await order.save()

        return NextResponse.json({
            sessionUrl: session.url,
            sessionId: session.id
        })
    } catch (error) {
        console.error('Error creating Stripe session:', error)
        return NextResponse.json({
            error: 'Failed to create payment session',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
