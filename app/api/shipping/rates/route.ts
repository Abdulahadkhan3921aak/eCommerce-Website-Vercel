import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import ShippoService, { ShippoAddressInput, ShippoParcel, ShippoShipmentRequestData } from '@/lib/services/shippo'

// Helper to convert item weight to a consistent unit (e.g., pounds)
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

// Helper to convert item dimensions to a consistent unit (e.g., inches)
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
    // Add other conversions if needed
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

        // Construct Shippo address_from (sender address from .env)
        const address_from: ShippoAddressInput = {
            name: process.env.SHIPPO_SENDER_NAME || "Butterflies Beading",
            street1: process.env.SHIPPO_SENDER_STREET1 || "123 Artisan Way",
            street2: process.env.SHIPPO_SENDER_STREET2 || "",
            city: process.env.SHIPPO_SENDER_CITY || "Craftsville",
            state: process.env.SHIPPO_SENDER_STATE || "NY",
            zip: process.env.SHIPPO_SENDER_ZIP || "10001",
            country: process.env.SHIPPO_SENDER_COUNTRY || "US",
            phone: process.env.SHIPPO_SENDER_PHONE || "5551234567",
            email: process.env.SHIPPO_SENDER_EMAIL || "shipping@butterfliesbeading.com",
            is_residential: false, // Assuming business sender address
        };

        // Construct Shippo address_to (recipient address)
        const address_to: ShippoAddressInput = {
            name: address.name,
            street1: address.line1,
            street2: address.line2,
            city: address.city,
            state: address.state,
            zip: address.postalCode, // Map from our 'postalCode'
            country: address.country || "US",
            phone: address.phone,
            email: address.email,
            is_residential: address.residential === undefined ? true : address.residential,
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
            const itemWeight = item.weight || 0.25; // Default item weight in lbs
            const itemWeightUnit = item.weightUnit || 'lb';
            totalWeightLb += convertWeightToLb(itemWeight, itemWeightUnit) * quantity;

            const itemLength = item.dimensions?.length || 6; // Default dimensions in inches
            const itemWidth = item.dimensions?.width || 6;
            const itemHeight = item.dimensions?.height || 2;
            const itemDimensionUnit = item.dimensions?.unit || 'in';

            maxLengthIn = Math.max(maxLengthIn, convertDimensionToIn(itemLength, itemDimensionUnit));
            maxWidthIn = Math.max(maxWidthIn, convertDimensionToIn(itemWidth, itemDimensionUnit));
            totalHeightIn += convertDimensionToIn(itemHeight, itemDimensionUnit) * quantity; // Simplistic stacking
        });

        // Ensure minimum dimensions and weight for very small orders
        maxLengthIn = Math.max(maxLengthIn, 6); // Min length 6 inches
        maxWidthIn = Math.max(maxWidthIn, 4);  // Min width 4 inches
        totalHeightIn = Math.max(totalHeightIn, 1); // Min height 1 inch
        totalWeightLb = Math.max(totalWeightLb, 0.1); // Minimum weight 0.1 lb

        const parcels: ShippoParcel[] = [{
            length: String(Math.ceil(maxLengthIn)), // Shippo expects strings
            width: String(Math.ceil(maxWidthIn)),
            height: String(Math.ceil(totalHeightIn)),
            distance_unit: 'in',
            weight: String(parseFloat(totalWeightLb.toFixed(2))), // Ensure weight is a string, rounded
            mass_unit: 'lb',
        }];

        const shipmentRequestData: ShippoShipmentRequestData = {
            address_from,
            address_to,
            parcels,
            async: false, // Get rates synchronously
            // carrier_accounts: [process.env.SHIPPO_USPS_ACCOUNT_ID] // Example: if you want to restrict to specific accounts
        };

        const shippoApiRates = await ShippoService.getRates(shipmentRequestData);

        const cartSubtotal = cartItems.reduce((total: number, item: any) => {
            return total + (item.effectivePrice * item.quantity)
        }, 0);

        const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || "100");
        const qualifiesForFreeShipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD;

        const processedRates = shippoApiRates
            .filter(rate => rate.servicelevel && rate.servicelevel.token && rate.servicelevel.name) // Ensure essential fields exist
            .map(rate => {
                const originalCost = parseFloat(rate.amount);
                const displayCost = qualifiesForFreeShipping ? 0 : originalCost;
                return {
                    rateId: rate.object_id,
                    serviceType: rate.servicelevel.token,
                    serviceName: `${rate.provider} ${rate.servicelevel.name}`,
                    cost: displayCost,
                    originalCost: originalCost,
                    estimatedDelivery: rate.estimated_days ? `Approx. ${rate.estimated_days} business day(s)` : (rate.duration_terms || 'Delivery time varies'),
                    deliveryDays: rate.estimated_days,
                    isFreeShipping: qualifiesForFreeShipping,
                    provider: rate.provider,
                    providerLogo: rate.provider_image_75, // or provider_image_200
                };
            })
            .sort((a, b) => a.cost - b.cost); // Sort by final display cost (cheapest first)

        return NextResponse.json({
            rates: processedRates,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            cartSubtotal, // For debugging or display if needed
            qualifiesForFreeShipping
        });

    } catch (error) {
        console.error('Shipping rates API error:', error);
        let errorMessage = 'Failed to calculate shipping rates.';
        if (error instanceof Error && error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Check if the error object has more details from Shippo
        // @ts-ignore
        if (error.detail) errorMessage = error.detail;
        // @ts-ignore
        else if (error.message && typeof error.message === 'string' && error.message.includes("Shippo")) errorMessage = error.message;


        return NextResponse.json({
            error: errorMessage,
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
