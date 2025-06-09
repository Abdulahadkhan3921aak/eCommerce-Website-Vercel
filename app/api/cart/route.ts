import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Cart from '@/lib/models/Cart'

export async function GET() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        // Find user's cart
        const cart = await Cart.findOne({ clerkId: userId })

        if (!cart) {
            // Return empty cart if none exists
            return NextResponse.json({ items: [] })
        }

        return NextResponse.json({ items: cart.items || [] })
    } catch (error) {
        console.error('Error fetching cart:', error)
        return NextResponse.json({
            error: 'Failed to fetch cart',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const { items } = await request.json()

        // Find or create cart
        let cart = await Cart.findOne({ clerkId: userId })

        if (!cart) {
            cart = new Cart({ clerkId: userId, items: items || [] })
        } else {
            cart.items = items || []
            cart.updatedAt = new Date()
        }

        await cart.save()

        return NextResponse.json({ success: true, items: cart.items })
    } catch (error) {
        console.error('Error updating cart:', error)
        return NextResponse.json({
            error: 'Failed to update cart',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
