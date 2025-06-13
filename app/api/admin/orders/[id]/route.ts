import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import { requirePermission } from '@/lib/auth/adminCheck'
import mongoose from 'mongoose'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requirePermission('canManageOrders')

        const resolvedParams = await params
        const orderId = resolvedParams.id

        await dbConnect()

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const resolvedParams = await params
        const orderId = resolvedParams.id

        await dbConnect()

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const orderId = resolvedParams.id

        await dbConnect()

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return NextResponse.json(
                { error: 'Invalid order ID' },
                { status: 400 }
            )
        }

        // Delete the order
        const result = await Order.deleteOne({
            _id: new mongoose.Types.ObjectId(orderId)
        })

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(
            { message: 'Order deleted successfully' },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error deleting order:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
