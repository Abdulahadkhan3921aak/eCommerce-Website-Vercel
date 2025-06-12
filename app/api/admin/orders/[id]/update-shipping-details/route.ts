import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import ShippoService, { ShippoAddressInput, ShippoParcel, ShippoShipmentRequestData, DistanceUnitEnum, WeightUnitEnum } from '@/lib/services/shippo';
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

        // Read request body once and extract all needed data
        const requestData = await request.json();
        const { shippingWeight, shippingDimensions, selectedRateId, rateDetails } = requestData;
        const orderId = resolvedParams.id;

        console.log('📋 [UpdateShipping] Received shipping data:', {
            orderId,
            weight: shippingWeight,
            dimensions: shippingDimensions,
            selectedRateId,
            hasRateDetails: !!rateDetails
        });

        // If this is just updating package details (no rate selected), get all rates
        if (!selectedRateId) {
            if (!shippingWeight || !shippingDimensions ||
                typeof shippingWeight !== 'number' || shippingWeight <= 0 ||
                typeof shippingDimensions.length !== 'number' || shippingDimensions.length <= 0 ||
                typeof shippingDimensions.width !== 'number' || shippingDimensions.width <= 0 ||
                typeof shippingDimensions.height !== 'number' || shippingDimensions.height <= 0) {
                console.error('❌ [UpdateShipping] Invalid shipping data provided');
                return NextResponse.json({ error: 'Invalid shipping weight or dimensions provided.' }, { status: 400 });
            }

            await dbConnect();
            console.log('🔗 [UpdateShipping] Database connected');

            const order = await Order.findById(orderId).populate('items.productId');

            if (!order) {
                console.error('❌ [UpdateShipping] Order not found:', orderId);
                return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            }

            console.log('📦 [UpdateShipping] Order found:', {
                orderNumber: order.orderNumber,
                status: order.status,
                originalTotal: order.total
            });

            // Update order with package details only
            order.shippingWeight = shippingWeight;
            order.shippingDimensions = shippingDimensions;

            // Get all available shipping rates
            const addressFrom: ShippoAddressInput = {
                name: process.env.SHIPPO_SENDER_NAME || "Butterflies Beading",
                street1: process.env.SHIPPO_SENDER_STREET1 || "123 Artisan Way",
                city: process.env.SHIPPO_SENDER_CITY || "Craftsville",
                state: process.env.SHIPPO_SENDER_STATE || "NY",
                zip: process.env.SHIPPO_SENDER_ZIP || "10001",
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

            const parcel: ShippoParcel = {
                length: String(shippingDimensions.length),
                width: String(shippingDimensions.width),
                height: String(shippingDimensions.height),
                distanceUnit: DistanceUnitEnum.In,
                weight: String(shippingWeight),
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

                    // Format rates for frontend selection
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
                    })).sort((a, b) => a.cost - b.cost); // Sort by cost
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
                message: 'Package details updated successfully',
                order: order,
                availableRates: availableRates,
                totalRates: availableRates.length
            });
        }
        // If rate is selected, apply it to the order
        else {
            await dbConnect();
            const order = await Order.findById(orderId).populate('items.productId');

            if (!order) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            }

            // Prevent updates if order is already shipped, cancelled, or rejected
            if (['shipped', 'cancelled', 'rejected', 'delivered'].includes(order.status!)) {
                console.warn('⚠️ [UpdateShipping] Cannot update - order status is:', order.status);
                return NextResponse.json({ error: `Order status is '${order.status}', cannot update shipping details.` }, { status: 400 });
            }

            // Validate that rateDetails are provided
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

            // Update order with selected shipping details
            order.shippingCost = newShippingCost;
            order.shippoShipment = {
                ...order.shippoShipment,
                rateId: rateDetails.rateId,
                carrier: rateDetails.carrier,
                serviceLevelToken: rateDetails.serviceLevelToken,
                serviceLevelName: rateDetails.serviceName,
                cost: newShippingCost,
                estimatedDeliveryDays: rateDetails.estimatedDays,
            };
            order.total = order.subtotal + newShippingCost + (order.tax || 0);

            let emailContentForUser = `Shipping rate has been selected for your order ${order.orderNumber}.`;

            if (order.total !== originalTotal) {
                console.log('💳 [UpdateShipping] Price adjustment required - updating payment status');
                order.isPriceAdjusted = true;
                order.status = 'pending_payment_adjustment';
                order.paymentStatus = 'pending_adjustment';

                // Cancel the previous payment intent if it exists
                if (order.stripePaymentIntentId) {
                    try {
                        const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
                        if (['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture'].includes(pi.status)) {
                            await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
                            order.stripePaymentIntentId = undefined;
                        }
                    } catch (piError) {
                        console.error(`Failed to cancel previous Payment Intent ${order.stripePaymentIntentId}:`, piError);
                    }
                }
                emailContentForUser += `\nThe total amount for your order has changed from $${originalTotal.toFixed(2)} to $${order.total.toFixed(2)}. Please visit your order page to complete the payment for the new amount.`;
            }

            order.emailHistory.push({
                sentBy: adminUserId,
                type: 'shipping_rate_selected',
                subject: `Shipping update for order ${order.orderNumber}`,
                content: emailContentForUser,
                sentAt: new Date(),
            });

            await order.save();
            console.log('✅ [UpdateShipping] Shipping rate applied successfully');

            return NextResponse.json({
                success: true,
                message: 'Shipping rate selected successfully',
                order: order,
                priceChanged: order.total !== originalTotal,
                selectedRate: rateDetails
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
