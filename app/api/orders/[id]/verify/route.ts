import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params
        const orderId = resolvedParams.id
        const authHeader = request.headers.get('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
        }

        const token = authHeader.substring(7) // Remove 'Bearer ' prefix

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

        // Return order data without sensitive information
        const safeOrder = {
            _id: order._id,
            orderNumber: order.orderNumber,
            items: order.items,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            tax: order.tax,
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
            shippingAddress: order.shippingAddress,
            shippoShipment: order.shippoShipment,
            customerEmail: order.customerEmail,
            createdAt: order.createdAt
        }

        return NextResponse.json({ order: safeOrder })
    } catch (error) {
        console.error('Error verifying token:', error)
        return NextResponse.json({
            error: 'Failed to verify token',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
