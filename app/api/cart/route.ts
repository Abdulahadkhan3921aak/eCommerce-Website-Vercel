import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserCart, addToUserCart, updateCartItemQuantity, removeFromUserCart } from '@/lib/db-utils'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cartItems = await getUserCart(userId)
    return NextResponse.json(cartItems)
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, quantity = 1, size, color } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const options = { size, color }
    const success = await addToUserCart(userId, productId, quantity, options)
    
    if (success) {
      return NextResponse.json({ message: 'Item added to cart' }, { status: 200 })
    } else {
      return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error adding to cart:', error)
    return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, quantity, size, color } = await request.json()

    if (!productId || quantity === undefined) {
      return NextResponse.json({ error: 'Product ID and quantity are required' }, { status: 400 })
    }

    const options = { size, color }
    const success = await updateCartItemQuantity(userId, productId, quantity, options)
    
    if (success) {
      return NextResponse.json({ message: 'Cart item updated' }, { status: 200 })
    } else {
      return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error updating cart:', error)
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, size, color } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const options = { size, color }
    const success = await removeFromUserCart(userId, productId, options)
    
    if (success) {
      return NextResponse.json({ message: 'Item removed from cart' }, { status: 200 })
    } else {
      return NextResponse.json({ error: 'Failed to remove item from cart' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error removing from cart:', error)
    return NextResponse.json({ error: 'Failed to remove item from cart' }, { status: 500 })
  }
}