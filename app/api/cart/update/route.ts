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

        const { cartItemId, quantity } = await request.json()

        if (!cartItemId || quantity === undefined) {
            console.error('Missing required fields:', { cartItemId, quantity })
            return NextResponse.json({ error: 'Cart item ID and quantity required' }, { status: 400 })
        }

        // Find user's cart
        const cart = await Cart.findOne({ clerkId: userId })

        if (!cart) {
            return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
        }

        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            const initialLength = cart.items.length
            cart.items = cart.items.filter(item => {
                const itemId = `${item.productId.toString()}_${item.unitId || 'default'}`
                return itemId !== cartItemId
            })

            if (cart.items.length === initialLength) {
                console.error('Item not found for removal:', cartItemId)
                return NextResponse.json({ error: 'Item not found in cart' }, { status: 404 })
            }
        } else {
            // Update quantity
            const itemIndex = cart.items.findIndex(item => {
                const itemId = `${item.productId.toString()}_${item.unitId || 'default'}`
                return itemId === cartItemId
            })

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity = quantity
            } else {
                console.error('Item not found for update:', cartItemId)
                console.error('Available items:', cart.items.map(item => ({
                    id: `${item.productId.toString()}_${item.unitId || 'default'}`,
                    name: item.name
                })))
                return NextResponse.json({ error: 'Item not found in cart' }, { status: 404 })
            }
        }

        cart.updatedAt = new Date()
        await cart.save()

        return NextResponse.json({ success: true, items: cart.items })
    } catch (error) {
        console.error('Error updating cart item:', error)
        return NextResponse.json({
            error: 'Failed to update cart item',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
