import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clearUserCart } from '@/lib/db-utils'

export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = await clearUserCart(userId)
    
    if (success) {
      return NextResponse.json({ message: 'Cart cleared successfully' }, { status: 200 })
    } else {
      return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error clearing cart:', error)
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 })
  }
}