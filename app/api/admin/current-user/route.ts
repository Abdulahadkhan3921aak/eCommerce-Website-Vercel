import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ role: 'customer' }, { status: 200 })
    }

    const role = user.privateMetadata?.role as string || 'customer'
    
    return NextResponse.json({ role }, { status: 200 })
  } catch (error) {
    console.error('Error getting current user role:', error)
    return NextResponse.json({ role: 'customer' }, { status: 200 })
  }
}
