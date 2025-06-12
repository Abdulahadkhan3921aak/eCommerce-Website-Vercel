import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { clerkClient } from '@/lib/clerk/clerk'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { shippingAddress } = await request.json()

        if (!shippingAddress) {
            return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
        }

        console.log('Saving shipping address for user:', userId)
        console.log('Address to save:', shippingAddress)

        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Ensure consistent format with both field name variants
        const addressToSave = {
            ...shippingAddress,
            zip: shippingAddress.postalCode || shippingAddress.zip, // Ensure zip field
            postalCode: shippingAddress.postalCode || shippingAddress.zip, // Ensure postalCode field
            street1: shippingAddress.line1, // Add street1 for Shippo compatibility
            street2: shippingAddress.line2, // Add street2 for Shippo compatibility
        }

        const updatedMetadata = {
            ...user.privateMetadata,
            shippingAddress: addressToSave,
        }

        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata: updatedMetadata,
        })

        console.log('Successfully saved shipping address to user metadata')

        return NextResponse.json({
            success: true,
            message: 'Shipping address saved successfully',
            savedAddress: addressToSave
        })

    } catch (error) {
        console.error('Error saving shipping address:', error)
        return NextResponse.json({
            error: 'Failed to save shipping address',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
