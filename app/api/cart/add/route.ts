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

        const { item } = await request.json()

        if (!item) {
            return NextResponse.json({ error: 'Item data required' }, { status: 400 })
        }

        // Find or create cart
        let cart = await Cart.findOne({ clerkId: userId })

        if (!cart) {
            cart = new Cart({ clerkId: userId, items: [] })
        }

        // Generate consistent cart item ID - handle both regular and custom products
        const cartItemId = `${item.productId}_${item.unitId || 'default'}`

        // Check if item already exists in cart using the same ID format
        const existingItemIndex = cart.items.findIndex(cartItem => {
            const existingId = `${cartItem.productId}_${cartItem.unitId || 'default'}`
            return existingId === cartItemId
        })

        if (existingItemIndex > -1) {
            // Update quantity of existing item
            cart.items[existingItemIndex].quantity += item.quantity
            cart.items[existingItemIndex].availableStock = item.stock || cart.items[existingItemIndex].availableStock
        } else {
            // Add new item to cart with proper field mapping
            const newCartItem = {
                productId: item.productId, // This can now be a string for custom items
                unitId: item.unitId,
                name: item.name,
                price: item.price,
                salePrice: item.salePrice,
                effectivePrice: item.effectivePrice,
                quantity: item.quantity,
                images: item.images || [],
                unitImages: item.unitImages,
                category: item.category,
                size: item.size,
                color: item.color,
                availableStock: item.stock || 0,
                weight: item.weight,
                dimensions: item.dimensions,
                customDetails: item.customDetails // Add custom details for custom items
            }

            cart.items.push(newCartItem)
        }

        cart.updatedAt = new Date()
        await cart.save()

        return NextResponse.json({ success: true, items: cart.items })
    } catch (error) {
        console.error('Error adding item to cart:', error)
        return NextResponse.json({
            error: 'Failed to add item to cart',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
