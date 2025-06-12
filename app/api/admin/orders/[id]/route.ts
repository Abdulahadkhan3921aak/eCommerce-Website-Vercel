import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import { requirePermission } from '@/lib/auth/adminCheck'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requirePermission('canManageOrders')
        await dbConnect()

        const orderId = params.id
        const order = await Order.findById(orderId)
            .populate('items.productId', 'name images price stock')

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json({ order })
    } catch (error) {
        console.error('Error fetching order:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to fetch order'
        }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        await dbConnect()

        const orderId = params.id
        const updateData = await request.json()

        const order = await Order.findByIdAndUpdate(
            orderId,
            {
                ...updateData,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        )

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            order
        })
    } catch (error) {
        console.error('Error updating order:', error)
        return NextResponse.json({
            error: 'Failed to update order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
