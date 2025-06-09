import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import Stripe from 'stripe'
import ShippoService from '@/lib/services/shippo'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId: adminUserId } = await auth() // Renamed for clarity
        const adminUser = await currentUser()

        if (!adminUserId || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const userRole = adminUser?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { adminNotes } = await request.json()
        const orderId = params.id

        await dbConnect

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (order.status !== 'pending_approval' || order.paymentStatus !== 'pending_approval') {
            return NextResponse.json({ error: 'Order is not pending approval or payment status is incorrect.' }, { status: 400 })
        }

        // Capture the payment
        if (!order.stripePaymentIntentId) {
            return NextResponse.json({ error: 'Stripe Payment Intent ID missing from order.' }, { status: 400 });
        }

        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.capture(order.stripePaymentIntentId);
            if (paymentIntent.status !== 'succeeded') {
                order.status = 'rejected'; // Or a new status like 'payment_failed'
                order.paymentStatus = 'failed';
                order.adminApproval = {
                    ...order.adminApproval,
                    isApproved: false,
                    rejectedBy: adminUserId,
                    rejectedAt: new Date(),
                    rejectionReason: `Payment capture failed: ${paymentIntent.last_payment_error?.message || 'Unknown Stripe error'}`,
                    adminNotes: adminNotes || order.adminApproval?.adminNotes || '', // Preserve existing notes
                };
                await order.save();
                // TODO: Send payment failed email
                return NextResponse.json({ error: `Payment capture failed: ${paymentIntent.last_payment_error?.message || 'Unknown Stripe error'}` }, { status: 400 });
            }
        } catch (stripeError: any) {
            console.error("Stripe capture error:", stripeError);
            order.status = 'rejected';
            order.paymentStatus = 'failed';
            order.adminApproval = {
                ...order.adminApproval,
                isApproved: false,
                rejectedBy: adminUserId,
                rejectedAt: new Date(),
                rejectionReason: `Payment capture error: ${stripeError.message}`,
                adminNotes: adminNotes || order.adminApproval?.adminNotes || '', // Preserve existing notes
            };
            await order.save();
            // TODO: Send payment failed email
            return NextResponse.json({ error: `Payment capture error: ${stripeError.message}` }, { status: 400 });
        }


        // Update inventory
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: -item.quantity } }, // Deduct stock
                { new: true }
            );
        }

        // Create Shippo shipping label if a rate was selected
        let shippoLabelInfo = null;
        if (order.shippoShipment && order.shippoShipment.rateId) {
            try {
                const transactionRequest = {
                    rate: order.shippoShipment.rateId,
                    label_file_type: "PDF_4x6" as "PDF_4x6", // Or "PDF"
                    async: false,
                };
                const transactionResult = await ShippoService.createShipmentLabel(transactionRequest);

                if (transactionResult.status === 'SUCCESS') {
                    shippoLabelInfo = {
                        trackingNumber: transactionResult.tracking_number,
                        labelUrl: transactionResult.label_url,
                        transactionId: transactionResult.object_id,
                        // Potentially update cost if it differs, or carrier if Shippo chose one
                        carrier: transactionResult.rate.provider || order.shippoShipment.carrier,
                        serviceLevelName: transactionResult.rate.servicelevel.name || order.shippoShipment.serviceLevelName,
                    };
                    order.shippoShipment = {
                        ...order.shippoShipment,
                        ...shippoLabelInfo,
                    };
                    order.status = 'processing'; // Order is now being processed for shipment
                } else {
                    console.warn('Shippo label creation was not immediately successful:', transactionResult.messages);
                    // Decide if this is a hard failure or if admin should manually create label
                    // For now, we'll log and continue, order status won't be 'shipped' yet.
                    order.adminApproval.adminNotes = `${adminNotes || order.adminApproval?.adminNotes || ''}\nShippo label warning: ${transactionResult.messages?.map(m => m.text).join(', ')}`;
                }
            } catch (error) {
                console.error('Shippo shipment label creation failed:', error);
                order.adminApproval.adminNotes = `${adminNotes || order.adminApproval?.adminNotes || ''}\nShippo label creation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
                // Continue without failing the approval, admin can handle shipping manually
            }
        } else {
            order.status = 'approved'; // No shipping info to create label, just approved
        }


        // Update order
        order.paymentStatus = 'captured'; // Or 'paid'
        order.adminApproval = {
            ...order.adminApproval,
            isApproved: true,
            approvedBy: adminUserId,
            approvedAt: new Date(),
            adminNotes: adminNotes || order.adminApproval?.adminNotes || '', // Ensure adminNotes are saved/updated
        };

        if (shippoLabelInfo && order.status !== 'processing') { // If label created, status should be processing or shipped
            order.status = 'processing'; // If not already set
        } else if (!shippoLabelInfo && order.status === 'pending_approval') {
            order.status = 'approved'; // If no label, just approved
        }


        // Add email to history
        order.emailHistory.push({
            sentBy: adminUserId,
            subject: 'Order Approved and Processing',
            content: `Your order ${order.orderNumber} has been approved and is now being processed. You will receive another email when it ships.`,
            type: 'approval'
        });

        await order.save();

        // TODO: Send approval email to customer (with items, shipping info if available)
        // Example: await sendOrderApprovedEmail(order);

        return NextResponse.json({
            success: true,
            order: order, // Send back the updated order
            shippoLabelInfo: shippoLabelInfo // Send back label info if created
        });
    } catch (error) {
        console.error('Error approving order:', error);
        // Attempt to find the order and update its status to reflect the error if possible
        try {
            const orderId = params.id;
            const order = await Order.findById(orderId);
            if (order && order.status === 'pending_approval') {
                order.status = 'rejected'; // Or a specific error status
                order.adminApproval = {
                    ...order.adminApproval,
                    isApproved: false,
                    rejectionReason: `System error during approval: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    rejectedAt: new Date(),
                };
                await order.save();
            }
        } catch (saveError) {
            console.error("Failed to update order status after approval error:", saveError);
        }

        return NextResponse.json({
            error: 'Failed to approve order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
