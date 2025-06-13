import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import ShippoService, { ShippoTransactionRequest } from '@/lib/services/shippo'

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
        const { rateId, rateDetails } = await request.json()

        if (!rateId || !rateDetails) {
            return NextResponse.json({
                error: 'Rate ID and details are required'
            }, { status: 400 })
        }

        await dbConnect()
        const order = await Order.findById(orderId)

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Calculate shipping cost (check for free shipping)
        const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || "100")
        const qualifiesForFreeShipping = order.subtotal >= FREE_SHIPPING_THRESHOLD
        const shippingCost = qualifiesForFreeShipping ? 0 : rateDetails.cost

        // Update order with selected shipping rate
        order.shippoShipment = {
            rateId: rateId,
            carrier: rateDetails.carrier,
            serviceLevelToken: rateDetails.serviceLevelToken,
            serviceLevelName: rateDetails.serviceLevelName,
            cost: shippingCost,
            estimatedDeliveryDays: rateDetails.estimatedDays,
        }

        const originalShippingCost = order.shippingCost || 0
        order.shippingCost = shippingCost
        order.total = order.subtotal + shippingCost + (order.tax || 0)

        // Generate shipping label immediately
        let labelInfo = null
        try {
            const transactionRequest: ShippoTransactionRequest = {
                rate: rateId,
                labelFileType: "PDF_4x6",
                async: false,
            }

            const transaction = await ShippoService.createShipmentLabel(transactionRequest)

            if (transaction.status === 'SUCCESS') {
                labelInfo = {
                    transactionId: transaction.objectId,
                    trackingNumber: transaction.trackingNumber,
                    labelUrl: transaction.labelUrl,
                }

                order.shippoShipment = {
                    ...order.shippoShipment,
                    ...labelInfo,
                }
                order.trackingNumber = transaction.trackingNumber
            }
        } catch (labelError) {
            console.error('Error creating shipping label:', labelError)
        }

        // Add to email history
        order.emailHistory = order.emailHistory || []
        order.emailHistory.push({
            sentBy: userId,
            type: 'shipping_rate_selected',
            subject: `Shipping rate selected for order ${order.orderNumber}`,
            content: `Shipping rate selected: ${rateDetails.serviceName} - $${shippingCost.toFixed(2)}${qualifiesForFreeShipping ? ' (Free shipping applied)' : ''}${labelInfo ? `\nShipping label generated. Tracking: ${labelInfo.trackingNumber}` : ''}`,
            sentAt: new Date(),
        })

        await order.save()

        return NextResponse.json({
            success: true,
            message: labelInfo ?
                'Shipping rate applied and label generated successfully!' :
                'Shipping rate applied successfully!',
            order: order,
            labelGenerated: !!labelInfo,
            labelUrl: labelInfo?.labelUrl
        })
    } catch (error) {
        console.error('Error selecting shipping rate:', error)
        return NextResponse.json({
            error: 'Failed to apply shipping rate',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
