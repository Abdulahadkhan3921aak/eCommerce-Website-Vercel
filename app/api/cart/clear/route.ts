import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Cart from '@/lib/models/Cart'

export async function POST() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        // Find and clear user's cart
        const cart = await Cart.findOne({ clerkId: userId })

        if (cart) {
            cart.items = []
            cart.updatedAt = new Date()
            await cart.save()
        }

        return NextResponse.json({ success: true, items: [] })
    } catch (error) {
        console.error('Error clearing cart:', error)
        return NextResponse.json({
            error: 'Failed to clear cart',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
