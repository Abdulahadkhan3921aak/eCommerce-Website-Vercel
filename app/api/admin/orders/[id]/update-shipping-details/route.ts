import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Order, { IOrder } from '@/lib/models/Order'; // Import IOrder
import Product from '@/lib/models/Product';
import ShippoService, { ShippoAddressInput, ShippoParcel, ShippoShipmentRequestData, DistanceUnitEnum, WeightUnitEnum, ShippoTransactionRequest } from '@/lib/services/shippo'; // Added ShippoTransactionRequest
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    console.log('📦 [UpdateShipping] Starting shipping details update for order:', resolvedParams.id);

    try {
        const { userId: adminUserId } = await auth();
        const adminUser = await currentUser();

        console.log('👤 [UpdateShipping] Admin user check:', { adminUserId: !!adminUserId, hasUser: !!adminUser });

        if (!adminUserId || !adminUser) {
            console.error('❌ [UpdateShipping] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = adminUser?.privateMetadata?.role as string;
        console.log('🏷️ [UpdateShipping] User role:', userRole);

        if (userRole !== 'admin') {
            console.error('❌ [UpdateShipping] Non-admin user attempted access');
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const requestData = await request.json();
        const { shippingWeight, shippingWeightUnit, shippingDimensions, selectedRateId, rateDetails } = requestData; // Added shippingWeightUnit
        const orderId = resolvedParams.id;

        console.log('📋 [UpdateShipping] Received shipping data:', {
            orderId,
            weight: shippingWeight,
            weightUnit: shippingWeightUnit,
            dimensions: shippingDimensions,
            selectedRateId,
            hasRateDetails: !!rateDetails
        });

        await dbConnect();
        console.log('🔗 [UpdateShipping] Database connected');

        const order = await Order.findById(orderId).populate('items.productId') as IOrder | null;

        if (!order) {
            console.error('❌ [UpdateShipping] Order not found:', orderId);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        console.log('📦 [UpdateShipping] Order found:', {
            orderNumber: order.orderNumber,
            status: order.status,
            originalTotal: order.total
        });



        // If this is just updating package details (no rate selected), get all rates
        if (!selectedRateId) {
            if (!shippingWeight || !shippingDimensions ||
                typeof shippingWeight !== 'number' || shippingWeight <= 0 ||
                !shippingWeightUnit || !['lb', 'kg'].includes(shippingWeightUnit) || // Validate weight unit
                typeof shippingDimensions.length !== 'number' || shippingDimensions.length <= 0 ||
                typeof shippingDimensions.width !== 'number' || shippingDimensions.width <= 0 ||
                typeof shippingDimensions.height !== 'number' || shippingDimensions.height <= 0 ||
                !shippingDimensions.unit || !['in', 'cm'].includes(shippingDimensions.unit) // Validate dimension unit
            ) {
                console.error('❌ [UpdateShipping] Invalid shipping data provided for fetching rates');
                return NextResponse.json({ error: 'Invalid shipping weight, units, or dimensions provided.' }, { status: 400 });
            }


            // Update order with package details only
            order.shippingWeight = shippingWeight;
            order.shippingWeightUnit = shippingWeightUnit;
            order.shippingDimensions = shippingDimensions;

            const addressFrom: ShippoAddressInput = {
                name: process.env.SHIPPO_SENDER_NAME || "Your Company Name",
                street1: process.env.SHIPPO_SENDER_STREET1 || "123 Main St",
                city: process.env.SHIPPO_SENDER_CITY || "Anytown",
                state: process.env.SHIPPO_SENDER_STATE || "CA",
                zip: process.env.SHIPPO_SENDER_ZIP || "90210",
                country: process.env.SHIPPO_SENDER_COUNTRY || "US",
            };

            const addressTo: ShippoAddressInput = {
                name: order.shippingAddress.name,
                street1: order.shippingAddress.line1,
                street2: order.shippingAddress.line2,
                city: order.shippingAddress.city,
                state: order.shippingAddress.state,
                zip: order.shippingAddress.postal_code,
                country: order.shippingAddress.country,
                is_residential: order.shippingAddress.residential,
            };

            // Convert dimensions and weight to Shippo's expected units (inches, pounds)
            const parcelWeightInLb = shippingWeightUnit === 'kg' ? ShippoService.unitConverters.kgToLb(shippingWeight) : shippingWeight;
            const parcelLengthInIn = shippingDimensions.unit === 'cm' ? ShippoService.unitConverters.cmToIn(shippingDimensions.length) : shippingDimensions.length;
            const parcelWidthInIn = shippingDimensions.unit === 'cm' ? ShippoService.unitConverters.cmToIn(shippingDimensions.width) : shippingDimensions.width;
            const parcelHeightInIn = shippingDimensions.unit === 'cm' ? ShippoService.unitConverters.cmToIn(shippingDimensions.height) : shippingDimensions.height;


            const parcel: ShippoParcel = {
                length: String(parcelLengthInIn.toFixed(2)),
                width: String(parcelWidthInIn.toFixed(2)),
                height: String(parcelHeightInIn.toFixed(2)),
                distanceUnit: DistanceUnitEnum.In,
                weight: String(parcelWeightInLb.toFixed(2)),
                massUnit: WeightUnitEnum.Lb,
            };

            const shipmentRequestData: ShippoShipmentRequestData = {
                addressFrom,
                addressTo,
                parcels: [parcel],
                async: false,
            };

            let availableRates = [];

            try {
                console.log('🚚 [UpdateShipping] Fetching all available shipping rates...');
                const shippoApiRates = await ShippoService.getRates(shipmentRequestData);

                if (shippoApiRates && shippoApiRates.length > 0) {
                    console.log('✅ [UpdateShipping] Rates received:', shippoApiRates.length);
                    availableRates = shippoApiRates.map(rate => ({
                        rateId: rate.objectId,
                        carrier: rate.provider,
                        serviceName: `${rate.provider} ${rate.servicelevel.name}`,
                        serviceLevelToken: rate.servicelevel.token,
                        serviceLevelName: rate.servicelevel.name,
                        cost: parseFloat(rate.amount),
                        currency: rate.currency,
                        estimatedDays: rate.estimatedDays,
                        deliveryEstimate: rate.estimatedDays
                            ? `${rate.estimatedDays} business day${rate.estimatedDays !== 1 ? 's' : ''}`
                            : 'Standard delivery',
                        attributes: rate.attributes || [],
                        providerImage: rate.providerImage75,
                        arrivesBy: rate.arrivesBy,
                        durationTerms: rate.durationTerms,
                        messages: rate.messages || []
                    })).sort((a, b) => a.cost - b.cost);
                }
            } catch (rateError) {
                console.error(`❌ [UpdateShipping] Error fetching rates for order ${orderId}:`, rateError);
                return NextResponse.json({
                    error: 'Failed to fetch shipping rates',
                    details: rateError instanceof Error ? rateError.message : 'Unknown error'
                }, { status: 500 });
            }

            await order.save();
            console.log('✅ [UpdateShipping] Package details updated, rates fetched');

            return NextResponse.json({
                success: true,
                message: 'Package details updated successfully. Rates fetched.',
                order: order,
                availableRates: availableRates,
                totalRates: availableRates.length
            });
        }
        // If rate is selected, apply it to the order AND generate label if order is 'accepted'
        else {
            if (['shipped', 'cancelled', 'rejected', 'delivered'].includes(order.status!)) {
                console.warn('⚠️ [UpdateShipping] Cannot update - order status is:', order.status);
                return NextResponse.json({ error: `Order status is '${order.status}', cannot update shipping details.` }, { status: 400 });
            }

            if (!rateDetails) {
                return NextResponse.json({ error: 'Rate details are required when selecting a rate' }, { status: 400 });
            }

            const originalTotal = order.total;
            const originalShippingCost = order.shippingCost || 0;
            const newShippingCost = rateDetails.cost;

            console.log('💰 [UpdateShipping] Applying selected rate:', {
                carrier: rateDetails.carrier,
                service: rateDetails.serviceName,
                oldCost: originalShippingCost,
                newCost: newShippingCost
            });

            order.shippingCost = newShippingCost;
            order.shippoShipment = {
                ...order.shippoShipment,
                rateId: rateDetails.rateId,
                carrier: rateDetails.carrier,
                serviceLevelToken: rateDetails.serviceLevelToken,
                serviceLevelName: rateDetails.serviceName,
                cost: newShippingCost,
                estimatedDeliveryDays: rateDetails.estimatedDays,
                // Clear previous label info if rate changes, will be repopulated if label generated
                labelUrl: undefined,
                trackingNumber: undefined,
                transactionId: undefined, // Also clear previous transactionId
            };
            order.total = order.subtotal + newShippingCost + (order.tax || 0);

            let emailContentForUser = `Shipping rate has been selected for your order ${order.orderNumber}. New shipping cost: $${newShippingCost.toFixed(2)}.`;
            let priceChanged = order.total !== originalTotal;

            if (priceChanged) {
                console.log('💳 [UpdateShipping] Price adjustment required due to shipping cost change.');
                order.isPriceAdjusted = true;

                // If order was already 'pending_payment' (e.g. link sent) or payment captured, needs adjustment.
                if (['pending_payment', 'captured', 'succeeded'].includes(order.paymentStatus!) || order.status === 'pending_payment') {
                    order.status = 'pending_payment_adjustment';
                    order.paymentStatus = 'pending_adjustment';
                    // Invalidate previous payment token if one exists
                    order.paymentToken = undefined;
                    order.paymentTokenExpiry = undefined;

                    if (order.stripePaymentIntentId) {
                        try {
                            const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
                            if (['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture'].includes(pi.status)) {
                                await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
                                console.log(`[UpdateShipping] Cancelled previous Stripe Payment Intent: ${order.stripePaymentIntentId}`);
                                order.stripePaymentIntentId = undefined; // Clear PI as it's cancelled
                            }
                        } catch (piError) {
                            console.error(`Failed to cancel previous Payment Intent ${order.stripePaymentIntentId}:`, piError);
                        }
                    }
                    emailContentForUser += `\nThe total amount for your order has changed from $${originalTotal.toFixed(2)} to $${order.total.toFixed(2)}. If a payment link was sent, it is now invalid. A new one may be required.`;
                }
            }

            // Generate label if order is 'accepted' and physical items exist
            let shippoLabelInfo = null;
            const hasPhysicalItems = order.items.some(item => {
                // Define what constitutes a physical item, e.g., not having a productId starting with 'service_' or 'digital_'
                return !item.productId?.startsWith('custom_') && !item.productId?.startsWith('service_') && !item.productId?.startsWith('digital_');
            });

            if (order.status === 'accepted' && hasPhysicalItems) {
                console.log('🏷️ [UpdateShipping] Order is accepted, attempting to generate shipping label...');
                try {
                    const transactionRequest: ShippoTransactionRequest = {
                        rate: rateDetails.rateId, // Use the newly selected rateId
                        labelFileType: "PDF_4x6",
                        async: false,
                    };
                    const transactionResult = await ShippoService.createShipmentLabel(transactionRequest);

                    if (transactionResult.status === 'SUCCESS') {
                        shippoLabelInfo = {
                            trackingNumber: transactionResult.trackingNumber,
                            labelUrl: transactionResult.labelUrl,
                            transactionId: transactionResult.objectId, // Store transactionId
                        };
                        order.shippoShipment = {
                            ...order.shippoShipment,
                            ...shippoLabelInfo,
                        };
                        console.log('✅ [UpdateShipping] Shippo label generated and stored:', shippoLabelInfo.labelUrl);
                        emailContentForUser += `\nYour shipping label has been generated. Tracking: ${shippoLabelInfo.trackingNumber}`;
                    } else {
                        console.warn('⚠️ [UpdateShipping] Shippo label creation was not immediately successful:', transactionResult.messages);
                        const shippoMessages = transactionResult.messages?.map(m => m.text).join(', ') || 'Unknown Shippo issue.';
                        order.adminApproval = { ...order.adminApproval, adminNotes: `${order.adminApproval?.adminNotes || ''}\nShippo label warning: ${shippoMessages}` };
                        emailContentForUser += `\nThere was an issue generating the shipping label: ${shippoMessages}`;
                    }
                } catch (labelError) {
                    console.error('❌ [UpdateShipping] Shippo shipment label creation failed:', labelError);
                    const errorMessage = labelError instanceof Error ? labelError.message : 'Unknown error during label creation.';
                    order.adminApproval = { ...order.adminApproval, adminNotes: `${order.adminApproval?.adminNotes || ''}\nShippo label creation error: ${errorMessage}` };
                    emailContentForUser += `\nThere was an error generating your shipping label: ${errorMessage}`;
                }
            }


            order.emailHistory.push({
                sentBy: adminUserId,
                type: 'shipping_rate_applied',
                subject: `Shipping Update for Order ${order.orderNumber}`,
                content: emailContentForUser, // More detailed content
                sentAt: new Date(),
            });

            await order.save();
            console.log('✅ [UpdateShipping] Shipping rate applied. Label generation attempted if applicable.');

            return NextResponse.json({
                success: true,
                message: 'Shipping rate selected successfully. Label generation attempted if order was accepted.',
                order: order,
                priceChanged: priceChanged,
                labelGenerated: !!shippoLabelInfo,
                labelUrl: shippoLabelInfo?.labelUrl
            });
        }

    } catch (error) {
        console.error('❌ [UpdateShipping] Error updating shipping details:', error);
        return NextResponse.json({
            error: 'Failed to update shipping details',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
