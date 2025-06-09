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

        // Map server cart items to frontend CartItem structure
        const mappedItems = cart.items.map(item => ({
            _id: `${item.productId.toString()}_${item.unitId || 'default'}`,
            productId: item.productId.toString(),
            name: item.name,
            price: item.price,
            salePrice: item.salePrice,
            effectivePrice: item.effectivePrice,
            images: item.images || [],
            unitImages: item.unitImages,
            category: item.category,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            unitId: item.unitId,
            stock: item.stock,
            weight: item.weight,
            dimensions: item.dimensions
        }))

        return NextResponse.json({ items: mappedItems })
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
