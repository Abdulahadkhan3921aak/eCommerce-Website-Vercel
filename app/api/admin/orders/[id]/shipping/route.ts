import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import ShippoService, { ShippoAddressInput, ShippoParcel, ShippoShipmentRequestData } from '@/lib/services/shippo'
import { DistanceUnitEnum, WeightUnitEnum } from 'shippo'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const resolvedParams = await params
        const orderId = resolvedParams.id
        const requestData = await request.json()

        await dbConnect()
        const order = await Order.findById(orderId)

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // This endpoint handles getting shipping rates and updating package details
        return await handleGetRates(order, requestData)
    } catch (error) {
        console.error('Shipping API error:', error)
        return NextResponse.json({
            error: 'Shipping operation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

async function handleGetRates(order: any, requestData: any) {
    const { shippingWeight, shippingWeightUnit, shippingDimensions } = requestData

    // Convert units to imperial (required by Shippo)
    let weightInLbs = shippingWeight
    if (shippingWeightUnit === 'kg') {
        weightInLbs = shippingWeight * 2.20462
    }

    let dimensionsInInches = {
        length: shippingDimensions.length,
        width: shippingDimensions.width,
        height: shippingDimensions.height
    }
    if (shippingDimensions.unit === 'cm') {
        dimensionsInInches = {
            length: shippingDimensions.length * 0.393701,
            width: shippingDimensions.width * 0.393701,
            height: shippingDimensions.height * 0.393701
        }
    }

    if (!weightInLbs || !dimensionsInInches.length || !dimensionsInInches.width || !dimensionsInInches.height) {
        return NextResponse.json({
            error: 'Package weight and dimensions are required'
        }, { status: 400 })
    }

    // Construct Shippo addresses
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
        is_residential: false,
    }

    const addressTo: ShippoAddressInput = {
        name: order.shippingAddress.name,
        street1: order.shippingAddress.line1,
        street2: order.shippingAddress.line2 || "",
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.postal_code,
        country: order.shippingAddress.country,
        phone: order.customerPhone || "",
        email: order.customerEmail,
        is_residential: order.shippingAddress.residential !== false,
    }

    const parcel: ShippoParcel = {
        length: String(dimensionsInInches.length),
        width: String(dimensionsInInches.width),
        height: String(dimensionsInInches.height),
        distanceUnit: DistanceUnitEnum.In,
        weight: String(weightInLbs),
        massUnit: WeightUnitEnum.Lb,
    }

    const shipmentRequestData: ShippoShipmentRequestData = {
        addressFrom,
        addressTo,
        parcels: [parcel],
        async: false,
    }

    try {
        const rates = await ShippoService.getRates(shipmentRequestData)

        const processedRates = rates.map(rate => ({
            rateId: rate.objectId,
            carrier: rate.provider,
            serviceName: `${rate.provider} ${rate.servicelevel.name}`,
            serviceLevelToken: rate.servicelevel.token,
            serviceLevelName: rate.servicelevel.name,
            cost: parseFloat(rate.amount),
            currency: rate.currency,
            estimatedDays: rate.estimatedDays,
            deliveryEstimate: rate.estimatedDays ?
                `${rate.estimatedDays} business day${rate.estimatedDays > 1 ? 's' : ''}` :
                'Varies',
            attributes: rate.attributes || [],
            providerImage: rate.providerImage75,
            arrivesBy: rate.arrivesBy,
            durationTerms: rate.durationTerms,
            messages: rate.messages || []
        })).sort((a, b) => a.cost - b.cost)

        // Update order with package details
        order.shippingWeight = shippingWeight
        order.shippingWeightUnit = shippingWeightUnit
        order.shippingDimensions = shippingDimensions
        await order.save()

        return NextResponse.json({
            success: true,
            message: `Package details updated. Found ${processedRates.length} shipping options.`,
            rates: processedRates
        })
    } catch (error) {
        console.error('Error getting shipping rates:', error)
        return NextResponse.json({
            error: 'Failed to get shipping rates',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
