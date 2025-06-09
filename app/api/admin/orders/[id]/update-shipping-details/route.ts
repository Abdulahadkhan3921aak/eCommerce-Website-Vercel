import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product'; // For item details if needed for recalculation
import ShippoService, { ShippoAddressInput, ShippoParcel, ShippoShipmentRequestData } from '@/lib/services/shippo';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId: adminUserId } = await auth();
        const adminUser = await currentUser();

        if (!adminUserId || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userRole = adminUser?.privateMetadata?.role as string;
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { shippingWeight, shippingDimensions } = await request.json();
        const orderId = params.id;

        if (!shippingWeight || !shippingDimensions ||
            typeof shippingWeight !== 'number' || shippingWeight <= 0 ||
            typeof shippingDimensions.length !== 'number' || shippingDimensions.length <= 0 ||
            typeof shippingDimensions.width !== 'number' || shippingDimensions.width <= 0 ||
            typeof shippingDimensions.height !== 'number' || shippingDimensions.height <= 0) {
            return NextResponse.json({ error: 'Invalid shipping weight or dimensions provided.' }, { status: 400 });
        }

        await dbConnect();
        const order = await Order.findById(orderId).populate('items.productId'); // Populate to get product details if needed for weight/dims

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Prevent updates if order is already shipped, cancelled, or rejected
        if (['shipped', 'cancelled', 'rejected', 'delivered'].includes(order.status!)) {
            return NextResponse.json({ error: `Order status is '${order.status}', cannot update shipping details.` }, { status: 400 });
        }

        const originalTotal = order.total;
        const originalShippingCost = order.shippingCost || 0;

        // Update order with new physical properties
        order.shippingWeight = shippingWeight;
        order.shippingDimensions = shippingDimensions;

        // Recalculate shipping cost using Shippo
        // Construct Shippo address_from (sender address from .env)
        const address_from: ShippoAddressInput = {
            name: process.env.SHIPPO_SENDER_NAME || "Butterflies Beading",
            street1: process.env.SHIPPO_SENDER_STREET1 || "123 Artisan Way",
            city: process.env.SHIPPO_SENDER_CITY || "Craftsville",
            state: process.env.SHIPPO_SENDER_STATE || "NY",
            zip: process.env.SHIPPO_SENDER_ZIP || "10001",
            country: process.env.SHIPPO_SENDER_COUNTRY || "US",
        };

        const address_to: ShippoAddressInput = {
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
            distance_unit: 'in', // Assuming inches, make this configurable if necessary
            weight: String(shippingWeight),
            mass_unit: 'lb', // Assuming pounds, make this configurable
        };

        const shipmentRequestData: ShippoShipmentRequestData = {
            address_from,
            address_to,
            parcels: [parcel],
            async: false,
        };

        let newShippingCost = originalShippingCost;
        let bestRateDetails = order.shippoShipment; // Keep original if no new rate found or error

        try {
            const shippoApiRates = await ShippoService.getRates(shipmentRequestData);
            if (shippoApiRates && shippoApiRates.length > 0) {
                // For simplicity, let's assume we pick the cheapest rate or a specific one.
                // If the original order had a specific service level, try to find a matching one.
                let chosenRate = shippoApiRates.find(r => r.servicelevel.token === order.shippoShipment?.serviceLevelToken);
                if (!chosenRate) {
                    chosenRate = shippoApiRates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
                }

                if (chosenRate) {
                    newShippingCost = parseFloat(chosenRate.amount);
                    bestRateDetails = {
                        rateId: chosenRate.object_id,
                        carrier: chosenRate.provider,
                        serviceLevelToken: chosenRate.servicelevel.token,
                        serviceLevelName: `${chosenRate.provider} ${chosenRate.servicelevel.name}`,
                        cost: newShippingCost,
                        estimatedDeliveryDays: chosenRate.estimated_days,
                    };
                }
            } else {
                // No rates found, could be an issue. For now, keep original cost or set to a default/error state.
                // This might mean the admin needs to manually adjust or check address/dimensions.
                console.warn(`No new shipping rates found for order ${orderId} after dimension update.`);
            }
        } catch (rateError) {
            console.error(`Error fetching new shipping rates for order ${orderId}:`, rateError);
            // Keep original shipping cost if fetching new rates fails
        }

        order.shippingCost = newShippingCost;
        order.shippoShipment = { ...order.shippoShipment, ...bestRateDetails, cost: newShippingCost }; // Update Shippo details
        order.total = order.subtotal + newShippingCost + (order.tax || 0); // Recalculate total (assuming tax is on subtotal + shipping)

        let emailContentForUser = `Shipping details for your order ${order.orderNumber} have been updated by our team.`;

        if (order.total !== originalTotal) {
            order.isPriceAdjusted = true;
            order.status = 'pending_payment_adjustment';
            order.paymentStatus = 'pending_adjustment';

            // Cancel the previous payment intent if it exists and is not yet captured/succeeded
            if (order.stripePaymentIntentId) {
                try {
                    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
                    if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation' || pi.status === 'requires_action' || pi.status === 'processing' || pi.status === 'requires_capture') {
                        await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
                        order.stripePaymentIntentId = undefined; // Clear old PI
                        // A new PI will need to be created for the new amount.
                        // This part of the flow (generating new payment link) is complex and
                        // might be better handled by redirecting user or sending a Stripe Invoice.
                        // For now, we mark it for adjustment.
                    }
                } catch (piError) {
                    console.error(`Failed to cancel previous Payment Intent ${order.stripePaymentIntentId}:`, piError);
                }
            }
            emailContentForUser += `\nThe total amount for your order has changed from $${originalTotal.toFixed(2)} to $${order.total.toFixed(2)}. Please visit your order page or follow the link in the subsequent email to complete the payment for the new amount.`;
            // TODO: Trigger a process to generate a new payment link/invoice for the difference or new total.
        }

        order.emailHistory.push({
            sentBy: adminUserId,
            type: 'shipping_update',
            subject: `Update regarding your order ${order.orderNumber}`,
            content: emailContentForUser,
            sentAt: new Date(),
        });

        await order.save();

        // TODO: Send actual email to customer (e.g., using an email service + Inngest)

        return NextResponse.json({
            success: true,
            message: 'Shipping details updated. If price changed, order status is now pending payment adjustment.',
            order: order,
            priceChanged: order.total !== originalTotal,
        });

    } catch (error) {
        console.error('Error updating shipping details:', error);
        return NextResponse.json({
            error: 'Failed to update shipping details',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
