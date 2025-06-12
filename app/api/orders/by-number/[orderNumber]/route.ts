import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'

export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const order = await Order.findOne({
            orderNumber: params.orderNumber,
            userId // Ensure user can only access their own orders
        }).lean()

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json({ order })
    } catch (error) {
        console.error('Error fetching order:', error)
        return NextResponse.json({
            error: 'Failed to fetch order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
