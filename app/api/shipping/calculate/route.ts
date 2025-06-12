import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface ShippingAddress {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    unitSystem?: 'imperial' | 'metric'; // Add unit system
}

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    weight?: number;
    weightUnit?: 'lb' | 'kg'; // Add weight unit
    dimensions?: {
        length: number;
        width: number;
        height: number;
        unit?: 'in' | 'cm'; // Add dimension unit
    };
}

interface ShippingRate {
    id: string;
    name: string;
    price: number;
    estimatedDays: string;
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { address, items }: { address: ShippingAddress; items: CartItem[] } = await req.json();

        // Validate required fields
        if (!address.street || !address.city || !address.state || !address.zipCode) {
            return NextResponse.json({ error: 'Incomplete address' }, { status: 400 });
        }

        // Calculate package weight and dimensions with unit conversion
        const totalWeight = items.reduce((sum, item) => {
            const weight = item.weight || 1; // Default 1 unit per item
            const weightUnit = item.weightUnit || 'lb';
            const weightInLb = weightUnit === 'kg' ? weight * 2.20462 : weight;
            return sum + (weightInLb * item.quantity);
        }, 0);

        // Mock shipping rates calculation
        // In a real app, you'd integrate with shipping APIs like USPS, UPS, FedEx, etc.
        const shippingRates: ShippingRate[] = calculateShippingRates(address, totalWeight);

        return NextResponse.json(shippingRates);
    } catch (error) {
        console.error('Error calculating shipping rates:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

function calculateShippingRates(address: ShippingAddress, weight: number): ShippingRate[] {
    const baseRate = 5.99;
    const weightMultiplier = Math.max(1, Math.ceil(weight / 2)); // $1 per 2 lbs

    // Mock rates - replace with real shipping API integration
    const rates: ShippingRate[] = [
        {
            id: 'standard',
            name: 'Standard Shipping',
            price: baseRate + (weightMultiplier * 1),
            estimatedDays: '5-7 business days',
        },
        {
            id: 'expedited',
            name: 'Expedited Shipping',
            price: baseRate + (weightMultiplier * 3),
            estimatedDays: '2-3 business days',
        },
        {
            id: 'overnight',
            name: 'Overnight Shipping',
            price: baseRate + (weightMultiplier * 8),
            estimatedDays: '1 business day',
        },
    ];

    // Adjust rates based on distance (mock calculation)
    if (address.state === 'CA' || address.state === 'NY') {
        // Higher rates for distant states
        rates.forEach(rate => rate.price += 2);
    }

    return rates;
}
