import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(
    request: NextRequest,
    { params }: { params: { orderId: string } }
) {
    try {
        // Extract token from Authorization header
        const authHeader = request.headers.get('authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            )
        }

        const token = authHeader.substring(7) // Remove 'Bearer ' prefix

        if (!token) {
            return NextResponse.json(
                { error: 'No token provided' },
                { status: 401 }
            )
        }

        const { orderId } = params

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

        // Return full order data
        return NextResponse.json({
            success: true,
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                customerEmail: order.customerEmail,
                total: order.total,
                subtotal: order.subtotal,
                shippingCost: order.shippingCost,
                tax: order.tax,
                status: order.status,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                stripePaymentIntentId: order.stripePaymentIntentId,
                createdAt: order.createdAt,
                items: order.items,
                shippingAddress: order.shippingAddress,
                adminApproval: order.adminApproval,
                shippoShipment: order.shippoShipment,
                shippingWeight: order.shippingWeight,
                shippingDimensions: order.shippingDimensions,
                isPriceAdjusted: order.isPriceAdjusted,
                originalOrderId: order.originalOrderId,
                emailHistory: order.emailHistory,
                paymentToken: order.paymentToken,
                paymentLinkUrl: order.paymentLinkUrl,
                paymentLinkExpiresAt: order.paymentLinkExpiresAt
            }
        })

    } catch (error) {
        console.error('Error verifying order:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
