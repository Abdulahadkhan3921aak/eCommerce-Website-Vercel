import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({
        role: 'customer',
        isAuthenticated: false
      }, { status: 200 })
    }

    const role = user.privateMetadata?.role as string || 'customer'

    return NextResponse.json({
      role,
      isAuthenticated: true,
      userId: user.id
    }, {
      status: 200,
      headers: {
        // Add cache headers to reduce redundant calls
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      }
    })
  } catch (error) {
    console.error('Error getting current user role:', error)
    return NextResponse.json({
      role: 'customer',
      isAuthenticated: false,
      error: 'Failed to fetch user data'
    }, { status: 200 })
  }
}
