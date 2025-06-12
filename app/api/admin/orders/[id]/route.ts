import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import { requirePermission } from '@/lib/auth/adminCheck'
import crypto from 'crypto'

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

        await dbConnect()

        const resolvedParams = await params
        const orderId = resolvedParams.id
        const updateData = await request.json()

        // Handle special actions
        if (updateData.action === 'generate_payment_link') {
            const { generateJWTToken } = await import('@/lib/utils/tokenUtils')

            const paymentToken = generateJWTToken(orderId, '7d')
            const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

            const order = await Order.findByIdAndUpdate(
                orderId,
                {
                    paymentToken,
                    paymentTokenExpiry: expiryDate,
                    updatedAt: new Date()
                },
                { new: true, runValidators: true }
            )

            if (!order) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 })
            }

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'
            const paymentLink = `${baseUrl}/payment/${orderId}?token=${paymentToken}`

            return NextResponse.json({
                success: true,
                paymentToken,
                paymentLink,
                expiryDate,
                order
            })
        }

        // Handle status updates with enhanced workflow
        if (updateData.status) {
            const validTransitions = {
                'pending_approval': ['accepted', 'shipping_calculated', 'rejected', 'removed'],
                'accepted': ['processing', 'shipped', 'rejected', 'removed'],
                'shipping_calculated': ['processing', 'shipped', 'rejected', 'removed'],
                'processing': ['shipped', 'delivered'],
                'shipped': ['delivered']
            }

            const currentOrder = await Order.findById(orderId)
            if (!currentOrder) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 })
            }

            const allowedStatuses = validTransitions[currentOrder.status as keyof typeof validTransitions] || []
            if (!allowedStatuses.includes(updateData.status)) {
                return NextResponse.json({
                    error: `Cannot transition from ${currentOrder.status} to ${updateData.status}`
                }, { status: 400 })
            }
        }

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
