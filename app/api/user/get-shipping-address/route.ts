import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await currentUser()
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }



        // Check for address in multiple possible locations/formats
        let savedAddress = null

        // Method 1: Check for nested shippingAddress
        const nestedAddress = user.privateMetadata?.shippingAddress
        if (nestedAddress && typeof nestedAddress === 'object') {
            savedAddress = nestedAddress
        }

        // Method 2: Check for direct address fields in privateMetadata (your current structure)
        if (!savedAddress) {
            const directAddress = user.privateMetadata as any
            if (directAddress?.name && directAddress?.line1 && directAddress?.city) {
                savedAddress = {
                    name: directAddress.name,
                    line1: directAddress.line1,
                    line2: directAddress.line2 || '',
                    city: directAddress.city,
                    state: directAddress.state,
                    postalCode: directAddress.postalCode || directAddress.zip,
                    country: directAddress.country || 'US',
                    phone: directAddress.phone || '',
                    email: directAddress.email || '',
                    residential: directAddress.residential
                }
            }
        }

        // Method 3: Check for legacy address format
        if (!savedAddress && user.privateMetadata?.address) {
            const legacyAddress = user.privateMetadata.address as any
            if (legacyAddress?.street && legacyAddress?.city) {
                savedAddress = {
                    name: legacyAddress.firstName && legacyAddress.lastName
                        ? `${legacyAddress.firstName} ${legacyAddress.lastName}`
                        : user.fullName || '',
                    line1: legacyAddress.street,
                    line2: '',
                    city: legacyAddress.city,
                    state: legacyAddress.state,
                    postalCode: legacyAddress.zipCode,
                    country: legacyAddress.country || 'US',
                    phone: legacyAddress.phone || '',
                    email: user.emailAddresses?.[0]?.emailAddress || ''
                }
            }
        }

        // Return the address or null if not found
        if (savedAddress) {
            // Ensure consistent format
            const formattedAddress = {
                name: savedAddress.name || user.fullName || '',
                line1: savedAddress.line1 || savedAddress.street1 || '',
                line2: savedAddress.line2 || savedAddress.street2 || '',
                city: savedAddress.city || '',
                state: savedAddress.state || '',
                postalCode: savedAddress.postalCode || savedAddress.zip || '',
                country: savedAddress.country || 'US',
                phone: savedAddress.phone || user.phoneNumbers?.[0]?.phoneNumber || '',
                email: savedAddress.email || user.emailAddresses?.[0]?.emailAddress || '',
                residential: savedAddress.residential
            }


            return NextResponse.json({
                success: true,
                address: formattedAddress,
                hasAddress: true
            })
        } else {
            console.log('No saved address found, returning user profile data for pre-filling')

            // Return basic user info for form pre-filling
            return NextResponse.json({
                success: true,
                address: {
                    name: user.fullName || '',
                    line1: '',
                    line2: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'US',
                    phone: user.phoneNumbers?.[0]?.phoneNumber || '',
                    email: user.emailAddresses?.[0]?.emailAddress || ''
                },
                hasAddress: false
            })
        }

    } catch (error) {
        console.error('Error fetching shipping address:', error)
        return NextResponse.json({
            error: 'Failed to fetch shipping address',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
