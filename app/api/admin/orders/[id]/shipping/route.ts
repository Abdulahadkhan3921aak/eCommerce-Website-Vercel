import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import ShippoService, { ShippoAddressInput, ShippoParcel, ShippoShipmentRequestData, ShippoTransactionRequest } from '@/lib/services/shippo'
import { DistanceUnitEnum, WeightUnitEnum } from 'shippo'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

        const { action, ...requestData } = await request.json()
        const orderId = params.id

        await dbConnect()
        const order = await Order.findById(orderId)

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        switch (action) {
            case 'get_rates':
                return await handleGetRates(order, requestData)
            case 'select_rate':
                return await handleSelectRate(order, requestData, userId)
            case 'create_label':
                return await handleCreateLabel(order, requestData, userId)
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error) {
        console.error('Shipping API error:', error)
        return NextResponse.json({
            error: 'Shipping operation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

async function handleGetRates(order: any, requestData: any) {
    const { weight, dimensions } = requestData

    if (!weight || !dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
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
        street2: order.shippingAddress.line2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.postal_code,
        country: order.shippingAddress.country,
        phone: order.customerPhone,
        email: order.customerEmail,
        is_residential: order.shippingAddress.residential !== false,
    }

    const parcel: ShippoParcel = {
        length: String(dimensions.length),
        width: String(dimensions.width),
        height: String(dimensions.height),
        distanceUnit: DistanceUnitEnum.In,
        weight: String(weight),
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

        // Calculate if order qualifies for free shipping
        const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || "100")
        const qualifiesForFreeShipping = order.subtotal >= FREE_SHIPPING_THRESHOLD

        const processedRates = rates.map(rate => ({
            rateId: rate.objectId,
            carrier: rate.provider,
            serviceName: `${rate.provider} ${rate.servicelevel.name}`,
            serviceLevelToken: rate.servicelevel.token,
            serviceLevelName: rate.servicelevel.name,
            cost: parseFloat(rate.amount),
            displayCost: qualifiesForFreeShipping ? 0 : parseFloat(rate.amount),
            originalCost: parseFloat(rate.amount),
            estimatedDays: rate.estimatedDays,
            deliveryEstimate: rate.estimatedDays ?
                `${rate.estimatedDays} business day${rate.estimatedDays > 1 ? 's' : ''}` :
                'Varies',
            isFreeShipping: qualifiesForFreeShipping,
            attributes: rate.attributes || [],
            providerImage: rate.providerImage75,
        })).sort((a, b) => a.cost - b.cost)

        // Update order with package details
        order.shippingWeight = weight
        order.shippingDimensions = dimensions
        await order.save()

        return NextResponse.json({
            success: true,
            rates: processedRates,
            packageDetails: { weight, dimensions },
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            qualifiesForFreeShipping,
            currentSubtotal: order.subtotal
        })
    } catch (error) {
        console.error('Error getting shipping rates:', error)
        return NextResponse.json({
            error: 'Failed to get shipping rates',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

async function handleSelectRate(order: any, requestData: any, adminUserId: string) {
    const { rateId, rateDetails } = requestData

    if (!rateId || !rateDetails) {
        return NextResponse.json({
            error: 'Rate ID and details are required'
        }, { status: 400 })
    }

    try {
        const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || "100")
        const qualifiesForFreeShipping = order.subtotal >= FREE_SHIPPING_THRESHOLD

        const originalShippingCost = order.shippingCost || 0
        const newShippingCost = qualifiesForFreeShipping ? 0 : rateDetails.cost
        const originalTotal = order.total

        // Update order with selected shipping rate
        order.shippoShipment = {
            rateId: rateId,
            carrier: rateDetails.carrier,
            serviceLevelToken: rateDetails.serviceLevelToken,
            serviceLevelName: rateDetails.serviceName,
            cost: newShippingCost,
            estimatedDeliveryDays: rateDetails.estimatedDays,
        }

        order.shippingCost = newShippingCost
        order.total = order.subtotal + newShippingCost + (order.tax || 0)

        // Check if total changed significantly
        const totalChanged = Math.abs(order.total - originalTotal) > 0.01

        if (totalChanged && !qualifiesForFreeShipping) {
            order.isPriceAdjusted = true
            if (order.status === 'approved') {
                order.status = 'pending_payment_adjustment'
                order.paymentStatus = 'pending_adjustment'
            }
        }

        // Add to email history
        order.emailHistory.push({
            sentBy: adminUserId,
            type: 'shipping_rate_selected',
            subject: `Shipping rate selected for order ${order.orderNumber}`,
            content: `Shipping rate selected: ${rateDetails.serviceName} - $${newShippingCost.toFixed(2)}${qualifiesForFreeShipping ? ' (Free shipping applied)' : ''}`,
            sentAt: new Date(),
        })

        await order.save()

        return NextResponse.json({
            success: true,
            message: 'Shipping rate selected successfully',
            order: order,
            priceChanged: totalChanged,
            qualifiesForFreeShipping
        })
    } catch (error) {
        console.error('Error selecting shipping rate:', error)
        return NextResponse.json({
            error: 'Failed to select shipping rate',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

async function handleCreateLabel(order: any, requestData: any, adminUserId: string) {
    const { rateId, labelFileType = "PDF_4x6" } = requestData

    if (!order.shippoShipment?.rateId && !rateId) {
        return NextResponse.json({
            error: 'No shipping rate selected. Please select a rate first.'
        }, { status: 400 })
    }

    const useRateId = rateId || order.shippoShipment.rateId

    try {
        const transactionRequest: ShippoTransactionRequest = {
            rate: useRateId,
            labelFileType: labelFileType as "PDF" | "PDF_4x6" | "PNG" | "ZPLII",
            async: false,
        }

        const transaction = await ShippoService.createShipmentLabel(transactionRequest)

        if (transaction.status === 'SUCCESS') {
            // Update order with shipping label details
            order.shippoShipment = {
                ...order.shippoShipment,
                transactionId: transaction.objectId,
                trackingNumber: transaction.trackingNumber,
                labelUrl: transaction.labelUrl,
            }

            order.trackingNumber = transaction.trackingNumber
            order.status = 'processing' // Update status to processing

            // Add to email history
            order.emailHistory.push({
                sentBy: adminUserId,
                type: 'shipping_label_created',
                subject: `Shipping label created for order ${order.orderNumber}`,
                content: `Shipping label created successfully. Tracking number: ${transaction.trackingNumber}`,
                sentAt: new Date(),
            })

            await order.save()

            return NextResponse.json({
                success: true,
                message: 'Shipping label created successfully',
                transaction: {
                    id: transaction.objectId,
                    status: transaction.status,
                    trackingNumber: transaction.trackingNumber,
                    labelUrl: transaction.labelUrl,
                },
                order: order
            })
        } else {
            return NextResponse.json({
                error: 'Label creation failed',
                details: transaction.messages?.map(m => m.text).join(', ') || 'Unknown error'
            }, { status: 400 })
        }
    } catch (error) {
        console.error('Error creating shipping label:', error)
        return NextResponse.json({
            error: 'Failed to create shipping label',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
