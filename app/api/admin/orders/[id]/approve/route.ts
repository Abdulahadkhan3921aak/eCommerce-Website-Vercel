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
        const { userId: adminUserId } = await auth()
        const adminUser = await currentUser()

        if (!adminUserId || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRole = adminUser?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { adminNotes } = await request.json()
        const orderId = params.id

        await dbConnect()

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // This endpoint now requires order to be 'accepted' and have shipping details
        if (order.status !== 'accepted') {
            return NextResponse.json({ error: 'Order must be accepted first before approval processing.' }, { status: 400 })
        }

        if (!order.shippoShipment?.labelUrl) {
            return NextResponse.json({ error: 'Shipping label must be generated before processing payment.' }, { status: 400 })
        }

        // Capture the payment
        if (!order.stripePaymentIntentId) {
            return NextResponse.json({ error: 'Stripe Payment Intent ID missing from order.' }, { status: 400 });
        }

        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.capture(order.stripePaymentIntentId);
            if (paymentIntent.status !== 'succeeded') {
                order.status = 'rejected';
                order.paymentStatus = 'failed';
                order.adminApproval = {
                    ...order.adminApproval,
                    isApproved: false,
                    rejectedBy: adminUserId,
                    rejectedAt: new Date(),
                    rejectionReason: `Payment capture failed: ${paymentIntent.last_payment_error?.message || 'Unknown Stripe error'}`,
                    adminNotes: adminNotes || order.adminApproval?.adminNotes || '',
                };
                await order.save();
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
                adminNotes: adminNotes || order.adminApproval?.adminNotes || '',
            };
            await order.save();
            return NextResponse.json({ error: `Payment capture error: ${stripeError.message}` }, { status: 400 });
        }

        // Update inventory
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: -item.quantity } },
                { new: true }
            );
        }

        // Update order status
        order.status = 'processing';
        order.paymentStatus = 'captured';
        order.adminApproval = {
            ...order.adminApproval,
            isApproved: true,
            approvedBy: adminUserId,
            approvedAt: new Date(),
            adminNotes: adminNotes || order.adminApproval?.adminNotes || '',
        };

        // Add email to history
        order.emailHistory.push({
            sentBy: adminUserId,
            subject: `Order ${order.orderNumber} - Payment Processed`,
            content: `Payment has been processed for your order ${order.orderNumber}. Your order is now being prepared for shipment.`,
            type: 'payment_processed',
            sentAt: new Date()
        });

        await order.save();

        return NextResponse.json({
            success: true,
            order: order,
            message: 'Payment processed successfully. Order is now being prepared for shipment.'
        });
    } catch (error) {
        console.error('Error processing order:', error);
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
            error: 'Failed to process order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
