import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import ShippoService, { ShippoAddressInput, ShippoParcel, ShippoShipmentRequestData } from '@/lib/services/shippo'
import { DistanceUnitEnum, WeightUnitEnum } from 'shippo'

// Helper to convert item weight to pounds (Shippo standard)
const convertWeightToLb = (weight: number, unit?: string): number => {
    if (!unit || unit.toLowerCase() === 'lb' || unit.toLowerCase() === 'lbs') {
        return weight;
    }
    if (unit.toLowerCase() === 'oz') {
        return weight / 16;
    }
    if (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'kgs') {
        return weight * 2.20462;
    }
    if (unit.toLowerCase() === 'g' || unit.toLowerCase() === 'gs') {
        return weight * 0.00220462;
    }
    return weight; // Default to assuming it's already in lbs if unit is unknown
};

// Helper to convert item dimensions to inches (Shippo standard)
const convertDimensionToIn = (dimension: number, unit?: string): number => {
    if (!unit || unit.toLowerCase() === 'in') {
        return dimension;
    }
    if (unit.toLowerCase() === 'cm') {
        return dimension * 0.393701;
    }
    if (unit.toLowerCase() === 'ft') {
        return dimension * 12;
    }
    if (unit.toLowerCase() === 'm') {
        return dimension * 39.3701;
    }
    return dimension; // Default to assuming it's already in inches
};


export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { address, cartItems } = await request.json()

        if (!address || !cartItems || cartItems.length === 0) {
            return NextResponse.json({
                error: 'Missing address or cart items'
            }, { status: 400 })
        }

        console.log('Calculating shipping rates for:', {
            addressCity: address.city,
            addressState: address.state,
            itemCount: cartItems.length
        })

        // Construct Shippo address_from (sender address from .env)
        const addressFrom: ShippoAddressInput = {
            name: process.env.SHIPPO_SENDER_NAME || "Butterflies Beading",
            street1: process.env.SHIPPO_SENDER_STREET1 || "123 Artisan Way",
            street2: process.env.SHIPPO_SENDER_STREET2 || "",
            city: process.env.SHIPPO_SENDER_CITY || "Craftsville",
            state: process.env.SHIPPO_SENDER_STATE || "NY",
            zip: process.env.SHIPPO_SENDER_ZIP || "10001",
            country: process.env.SHIPPO_SENDER_COUNTRY || "US",
            phone: process.env.SHIPPO_SENDER_PHONE || "5551234567",
            email: process.env.SHIPPO_SENDER_EMAIL || "shipping@butterfliesbeading.com",
            is_residential: false, // Use snake_case
        };

        // Construct Shippo address_to (recipient address)
        const addressTo: ShippoAddressInput = {
            name: address.name,
            street1: address.line1,
            street2: address.line2,
            city: address.city,
            state: address.state,
            zip: address.postalCode, // Map from our 'postalCode' to Shippo's 'zip'
            country: address.country || "US",
            phone: address.phone,
            email: address.email,
            is_residential: address.residential === undefined ? true : address.residential, // Use snake_case
        };

        // Construct Shippo parcels from cart items
        // For simplicity, we'll create one parcel for the whole order.
        // More complex logic could split into multiple parcels or use pre-defined boxes.
        let totalWeightLb = 0;
        // For a single package, we might take the max dimensions of any item,
        // or sum them if stacking, or use a standard box size.
        // Here's a simple approach: max L, max W, sum H.
        let maxLengthIn = 0, maxWidthIn = 0, totalHeightIn = 0;

        cartItems.forEach((item: any) => {
            const quantity = item.quantity || 1;
            const itemWeight = item.weight || 0.25; // Default item weight
            const itemWeightUnit = item.weightUnit || 'lb';
            totalWeightLb += convertWeightToLb(itemWeight, itemWeightUnit) * quantity;

            const itemLength = item.dimensions?.length || 6; // Default dimensions
            const itemWidth = item.dimensions?.width || 6;
            const itemHeight = item.dimensions?.height || 2;
            const itemDimensionUnit = item.dimensions?.unit || 'in';

            maxLengthIn = Math.max(maxLengthIn, convertDimensionToIn(itemLength, itemDimensionUnit));
            maxWidthIn = Math.max(maxWidthIn, convertDimensionToIn(itemWidth, itemDimensionUnit));
            totalHeightIn += convertDimensionToIn(itemHeight, itemDimensionUnit) * quantity;
        });

        // Ensure minimum dimensions and weight for very small orders
        maxLengthIn = Math.max(maxLengthIn, 6); // Min length 6 inches
        maxWidthIn = Math.max(maxWidthIn, 4);  // Min width 4 inches
        totalHeightIn = Math.max(totalHeightIn, 1); // Min height 1 inch
        totalWeightLb = Math.max(totalWeightLb, 0.1); // Minimum weight 0.1 lb

        const parcels: ShippoParcel[] = [{
            length: String(Math.ceil(maxLengthIn)),
            width: String(Math.ceil(maxWidthIn)),
            height: String(Math.ceil(totalHeightIn)),
            distanceUnit: DistanceUnitEnum.In,
            weight: String(parseFloat(totalWeightLb.toFixed(2))),
            massUnit: WeightUnitEnum.Lb,
        }];

        const shipmentRequestData: ShippoShipmentRequestData = {
            addressFrom,
            addressTo,
            parcels,
            async: false,
        };

        console.log('Shipment request data:', {
            addressFrom: addressFrom.city,
            addressTo: addressTo.city,
            parcelsCount: parcels.length,
            totalWeight: parcels[0]?.weight
        })

        const shippoApiRates = await ShippoService.getRates(shipmentRequestData)

        const cartSubtotal = cartItems.reduce((total: number, item: any) => {
            return total + (item.effectivePrice * item.quantity)
        }, 0)

        const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || "100")
        const qualifiesForFreeShipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD

        console.log('Shipping calculation:', {
            cartSubtotal,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            qualifiesForFreeShipping,
            ratesCount: shippoApiRates.length
        })

        const processedRates = shippoApiRates
            .filter(rate => {
                // More robust filtering
                const hasRequiredFields = rate.servicelevel &&
                    rate.servicelevel.token &&
                    rate.servicelevel.name &&
                    rate.objectId &&
                    rate.amount

                if (!hasRequiredFields) {
                    console.log('Filtering out incomplete rate:', rate)
                }

                return hasRequiredFields
            })
            .map(rate => {
                const originalCost = parseFloat(rate.amount)
                const displayCost = qualifiesForFreeShipping ? 0 : originalCost
                return {
                    rateId: rate.objectId,
                    serviceType: rate.servicelevel.token,
                    serviceName: `${rate.provider} ${rate.servicelevel.name}`,
                    cost: displayCost,
                    originalCost: originalCost,
                    estimatedDelivery: rate.estimatedDays ?
                        `Approx. ${rate.estimatedDays} business day(s)` :
                        (rate.durationTerms || 'Delivery time varies'),
                    deliveryDays: rate.estimatedDays,
                    isFreeShipping: qualifiesForFreeShipping,
                    provider: rate.provider,
                    providerLogo: rate.providerImage75,
                }
            })
            .sort((a, b) => a.cost - b.cost)

        console.log('Processed rates:', processedRates.length)

        return NextResponse.json({
            rates: processedRates,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            cartSubtotal,
            qualifiesForFreeShipping
        })

    } catch (error) {
        console.error('Shipping rates API error:', error)

        let errorMessage = 'Failed to calculate shipping rates.'
        let statusCode = 500

        if (error instanceof Error) {
            errorMessage = error.message

            // Handle specific Shippo errors
            if (error.message.includes('Invalid address')) {
                statusCode = 400
                errorMessage = 'Invalid shipping address. Please check and try again.'
            } else if (error.message.includes('No rates')) {
                statusCode = 400
                errorMessage = 'No shipping options available for this address.'
            }
        }

        return NextResponse.json({
            error: errorMessage,
            details: error instanceof Error ? error.message : String(error)
        }, { status: statusCode })
    }
}
