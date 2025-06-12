import { auth, currentUser } from '@clerk/nextjs/server'
import { clerkClient } from '@/lib/clerk/clerk'
import ShippoService, { ShippoAddressInput } from '@/lib/services/shippo'
import { NextRequest, NextResponse } from 'next/server'


export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const requestBody = await request.json()

        // Handle nested address structure from cart page
        const inputAddress = requestBody.address || requestBody

        // Basic validation for required fields
        if (!inputAddress.name || !inputAddress.line1 || !inputAddress.city || !inputAddress.state || !inputAddress.postalCode || !inputAddress.country) {
            console.error('Missing required address fields:', { inputAddress, originalRequest: requestBody })
            return NextResponse.json({
                error: 'Missing required address fields (name, line1, city, state, zip/postalCode, country)'
            }, { status: 400 })
        }

        // Extract zip code from either field
        const zipCode = inputAddress.zip || inputAddress.postalCode;

        // Check for PO Box for US addresses
        if (inputAddress.country === 'US' && (inputAddress.line1.toLowerCase().includes('po box') || inputAddress.line1.toLowerCase().includes('p.o. box'))) {
            return NextResponse.json({
                isValid: false,
                messages: ['PO Box addresses are not accepted for US shipments. Please provide a street address.'],
                isResidential: inputAddress.residential,
                unitSystem: 'imperial' // Add unit system info
            }, { status: 200 })
        }

        // Map to Shippo format - use exact field names from documentation
        const shippoAddress: ShippoAddressInput = {
            name: inputAddress.name,
            street1: inputAddress.line1,
            street2: inputAddress.line2,
            city: inputAddress.city,
            state: inputAddress.state,
            zip: zipCode,
            country: inputAddress.country,
            phone: inputAddress.phone,
            email: inputAddress.email,
            is_residential: inputAddress.residential,
            validate: true
        }

        const validation = await ShippoService.validateAddress(shippoAddress)

        let responseCorrectedAddress = null;
        if (validation.correctedAddress) {
            responseCorrectedAddress = {
                name: validation.correctedAddress.name,
                line1: validation.correctedAddress.street1,
                line2: validation.correctedAddress.street2,
                city: validation.correctedAddress.city,
                state: validation.correctedAddress.state,
                zip: validation.correctedAddress.zip,
                postalCode: validation.correctedAddress.zip, // Ensure both formats
                country: validation.correctedAddress.country,
                phone: validation.correctedAddress.phone || shippoAddress.phone,
                email: validation.correctedAddress.email || shippoAddress.email,
            };
        }

        try {
            const user = await currentUser();
            if (!user) {
                console.error('User not found for ID:', userId);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            console.log('Saving validated address to user metadata:', userId);

            // Ensure we save in a consistent format
            const addressToSave = responseCorrectedAddress || {
                name: inputAddress.name,
                line1: inputAddress.line1,
                line2: inputAddress.line2,
                city: inputAddress.city,
                state: inputAddress.state,
                postalCode: zipCode,
                zip: zipCode, // Include both formats for compatibility
                country: inputAddress.country,
                phone: inputAddress.phone,
                email: inputAddress.email,
                residential: validation.isResidential
            };

            const metadataToUpdate = {
                ...user.privateMetadata,
                shippingAddress: {
                    ...addressToSave,
                    residential: validation.isResidential,
                },
            };

            console.log('Updating user metadata with address:', metadataToUpdate.shippingAddress);

            await clerkClient?.users?.updateUserMetadata(userId, {
                privateMetadata: metadataToUpdate,
            });

            console.log('Successfully saved address to user metadata');
        } catch (error) {
            console.error('Error updating user metadata with shipping address:', error);
        }

        return NextResponse.json({
            isValid: validation.isValid,
            correctedAddress: responseCorrectedAddress,
            messages: validation.messages,
            isResidential: validation.isResidential
        })

    } catch (error) {
        console.error('Address validation API error:', error)
        return NextResponse.json({
            error: 'Address validation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function basicAddressValidation(request: NextRequest) {
    try {
        const address = await request.json()

        // Basic validation - you can integrate with a real address validation service
        const requiredFields = ['name', 'line1', 'city', 'state', 'postalCode', 'country']
        const missingFields = requiredFields.filter(field => !address[field])

        if (missingFields.length > 0) {
            return NextResponse.json({
                error: `Missing required fields: ${missingFields.join(', ')}`
            }, { status: 400 })
        }

        // Return the validated address (could be enhanced with real validation service)
        return NextResponse.json({
            isValid: true,
            validatedAddress: {
                name: address.name,
                line1: address.line1,
                line2: address.line2 || '',
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country || 'US',
                phone: address.phone || '',
                email: address.email || ''
            }
        })
    } catch (error) {
        console.error('Address validation error:', error)
        return NextResponse.json({
            error: 'Failed to validate address'
        }, { status: 500 })
    }
}
