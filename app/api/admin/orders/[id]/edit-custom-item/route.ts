import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth()
        const user = await currentUser()
        const resolvedParams = await params

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        await dbConnect()

        const { itemIndex, updatedItem } = await request.json()
        const orderId = resolvedParams.id

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (itemIndex < 0 || itemIndex >= order.items.length) {
            return NextResponse.json({ error: 'Invalid item index' }, { status: 400 })
        }

        // Update the specific item
        const item = order.items[itemIndex]
        const oldPrice = item.price
        const oldQuantity = item.quantity

        item.name = updatedItem.name
        item.price = updatedItem.price
        item.quantity = updatedItem.quantity
        item.customDetails = { ...item.customDetails, ...updatedItem.customDetails }

        // Recalculate order totals
        const oldItemTotal = oldPrice * oldQuantity
        const newItemTotal = item.price * item.quantity
        const difference = newItemTotal - oldItemTotal

        order.subtotal += difference
        order.total = order.subtotal + (order.shippingCost || 0) + (order.tax || 0)

        // Add note about the change
        const changeNote = `Custom item #${itemIndex + 1} updated by admin. Price: $${oldPrice} → $${item.price}, Qty: ${oldQuantity} → ${item.quantity}. Order total adjusted by $${difference.toFixed(2)}.`

        if (!order.adminApproval) {
            order.adminApproval = {}
        }
        order.adminApproval.adminNotes = (order.adminApproval.adminNotes || '') + '\n' + changeNote

        // Add email history entry
        order.emailHistory.push({
            sentBy: userId,
            type: 'custom_item_updated',
            subject: `Custom Item Updated - Order ${order.orderNumber}`,
            content: changeNote,
            sentAt: new Date()
        })

        // Mark order as price adjusted if it has payment info
        if (order.paymentStatus !== 'pending_approval' && order.paymentStatus !== 'pending') {
            order.isPriceAdjusted = true
            if (order.paymentStatus === 'pending_payment' || order.status === 'pending_payment') {
                order.status = 'pending_payment_adjustment'
                order.paymentStatus = 'pending_adjustment'
                // Invalidate existing payment token if any
                order.paymentToken = undefined
                order.paymentTokenExpiry = undefined
            }
        }

        await order.save()

        return NextResponse.json({
            success: true,
            message: 'Custom item updated successfully',
            order: order
        })

    } catch (error) {
        console.error('Error updating custom item:', error)
        return NextResponse.json({
            error: 'Failed to update custom item',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
