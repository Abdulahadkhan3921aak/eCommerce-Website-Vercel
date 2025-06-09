import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import ShippoService, { ShippoAddressInput } from '@/lib/services/shippo'
import { clerkClient } from '@clerk/nextjs/server';


export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const inputAddress = await request.json()

        // Basic validation for required fields
        if (!inputAddress.name || !inputAddress.line1 || !inputAddress.city || !inputAddress.state || !inputAddress.postalCode || !inputAddress.country) {
            return NextResponse.json({
                error: 'Missing required address fields (name, line1, city, state, postalCode, country)'
            }, { status: 400 })
        }

        // Check for PO Box for US addresses - Shippo might not ship to PO Boxes with all carriers
        if (inputAddress.country === 'US' && (inputAddress.line1.toLowerCase().includes('po box') || inputAddress.line1.toLowerCase().includes('p.o. box'))) {
            return NextResponse.json({
                isValid: false,
                messages: ['PO Box addresses are not accepted for US shipments. Please provide a street address.'],
                isResidential: inputAddress.residential // Pass back what was sent
            }, { status: 200 }); // API call successful, but address type is rejected by business rule
        }


        // Map to Shippo format
        const shippoAddress: ShippoAddressInput = {
            name: inputAddress.name,
            street1: inputAddress.line1,
            street2: inputAddress.line2,
            city: inputAddress.city,
            state: inputAddress.state,
            zip: inputAddress.postalCode, // Shippo uses 'zip'
            country: inputAddress.country, // Ensure this is an ISO 2-letter code
            phone: inputAddress.phone,
            email: inputAddress.email,
            is_residential: inputAddress.residential, // Pass residential flag if collected
            validate: true // Explicitly request validation
        }

        const validation = await ShippoService.validateAddress(shippoAddress)

        let responseCorrectedAddress = null;
        if (validation.correctedAddress) {
            // Map Shippo's corrected address back to our application's format
            responseCorrectedAddress = {
                name: validation.correctedAddress.name,
                line1: validation.correctedAddress.street1,
                line2: validation.correctedAddress.street2,
                city: validation.correctedAddress.city,
                state: validation.correctedAddress.state,
                postalCode: validation.correctedAddress.zip,
                country: validation.correctedAddress.country,
                phone: validation.correctedAddress.phone || shippoAddress.phone, // Preserve original if not corrected
                email: validation.correctedAddress.email || shippoAddress.email, // Preserve original if not corrected
                // is_residential is part of the top-level validation response (validation.isResidential)
            };
        }


        if (validation.isValid && responseCorrectedAddress) {
            // Save address to user's private metadata if it's valid
            try {
                const user = await currentUser() // Fetch fresh user data
                if (user) {
                    const metadataToUpdate = {
                        ...user.privateMetadata,
                        shippingAddress: { // Store in our app's format
                            ...responseCorrectedAddress,
                            residential: validation.isResidential // Ensure residential status from validation is saved
                        }
                    };
                    await clerkClient.users.updateUser(userId, {
                        privateMetadata: metadataToUpdate
                    });
                }
            } catch (error) {
                console.error('Error updating user metadata with shipping address:', error)
                // Non-critical error, proceed with response
            }
        }

        return NextResponse.json({
            isValid: validation.isValid,
            correctedAddress: responseCorrectedAddress, // Send back in our app's format
            messages: validation.messages,
            isResidential: validation.isResidential // This comes from ShippoService after validation
        })

    } catch (error) {
        console.error('Address validation API error:', error)
        return NextResponse.json({
            error: 'Address validation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
