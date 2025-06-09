import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Cart from '@/lib/models/Cart'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const { cartItemId } = await request.json()

        if (!cartItemId) {
            return NextResponse.json({ error: 'Cart item ID required' }, { status: 400 })
        }

        // Find user's cart
        const cart = await Cart.findOne({ clerkId: userId })

        if (!cart) {
            return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
        }

        const initialLength = cart.items.length

        // Remove item from cart using consistent ID format
        cart.items = cart.items.filter(item => {
            const itemId = `${item.productId.toString()}_${item.unitId || 'default'}`;
            return itemId !== cartItemId;
        })

        if (cart.items.length === initialLength) {
            console.error('Item not found for removal:', cartItemId)
            console.error('Available items:', cart.items.map(item => ({
                id: `${item.productId.toString()}_${item.unitId || 'default'}`,
                name: item.name
            })))
            return NextResponse.json({ error: 'Item not found in cart' }, { status: 404 })
        }

        cart.updatedAt = new Date()
        await cart.save()

        return NextResponse.json({ success: true, items: cart.items })
    } catch (error) {
        console.error('Error removing item from cart:', error)
        return NextResponse.json({
            error: 'Failed to remove item from cart',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
