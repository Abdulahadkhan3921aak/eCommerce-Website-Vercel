import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Order, { IOrder } from '@/lib/models/Order';
import crypto from 'crypto';
import { logPaymentLinkEmail } from '@/utils/email-collection';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        const user = await currentUser();
        const resolvedParams = await params;

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = user?.privateMetadata?.role as string;
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const orderId = resolvedParams.id;

        await dbConnect();

        const order = await Order.findById(orderId) as IOrder | null;
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Validate order status - should be 'accepted' for initial generation or 'pending_payment' for regeneration
        // For simplicity, we'll check for both states. Frontend should gate this appropriately.
        const allowedStatuses = ['accepted', 'pending_payment'];
        if (!allowedStatuses.includes(order.status)) {
            return NextResponse.json({
                error: `Order must be in 'accepted' or 'pending_payment' state to generate a payment link. Current status: ${order.status}`
            }, { status: 400 });
        }

        // Check if physical items exist and if a label has been generated
        const hasPhysicalItems = order.items.some(item => {
            // Define what constitutes a physical item, e.g., not having a productId starting with 'service_' or 'digital_'
            // This is an example, adjust to your product ID convention
            return !item.productId?.startsWith('custom_') && !item.productId?.startsWith('service_') && !item.productId?.startsWith('digital_');
        });

        if (hasPhysicalItems && !order.shippoShipment?.labelUrl) {
            return NextResponse.json({ error: 'Shipping label must be generated for physical items before creating a payment link.' }, { status: 400 });
        }

        // Check if tax has been set (can be zero, but must be explicitly set)
        if (!order.isTaxSet && order.tax === undefined) {
            return NextResponse.json({ error: 'Tax amount must be set before generating a payment link. Please update the tax amount in the order details.' }, { status: 400 });
        }

        // Determine if this is a regeneration (order already has a payment token)
        const isRegeneration = !!order.paymentToken;

        // Generate secure payment token
        const paymentToken = crypto.randomBytes(32).toString('hex');
        order.paymentToken = paymentToken;
        order.paymentTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update order status to reflect payment is pending via link (only if not already pending)
        if (order.status !== 'pending_payment') {
            order.status = 'pending_payment';
        }
        order.paymentStatus = 'pending_payment'; // Explicitly set paymentStatus

        // Log email with payment link
        const fullPaymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin')}/payment/${orderId}?token=${paymentToken}`;
        logPaymentLinkEmail(order, fullPaymentLink, userId);

        const emailSubject = isRegeneration
            ? `Updated Payment Link for Order ${order.orderNumber}`
            : `Payment Required for Order ${order.orderNumber}`;

        const emailContent = isRegeneration
            ? `New secure payment link generated for order ${order.orderNumber}. Link: ${fullPaymentLink}. Sent to ${order.customerEmail}.`
            : `Secure payment link generated for order ${order.orderNumber}. Link: ${fullPaymentLink}. Sent to ${order.customerEmail}.`;

        order.emailHistory.push({
            sentBy: userId,
            subject: emailSubject,
            content: emailContent,
            type: isRegeneration ? 'payment_link_regenerated' : 'payment_link_generated',
            sentAt: new Date(),
        });

        await order.save();

        return NextResponse.json({
            success: true,
            message: isRegeneration
                ? 'Payment link regenerated and email logged successfully.'
                : 'Payment link generated and email logged successfully.',
            order: order,
            paymentLink: `/payment/${orderId}?token=${paymentToken}`, // Relative link for admin/internal use
            isRegeneration,
        });

    } catch (error) {
        console.error('Error generating payment link:', error);
        return NextResponse.json({
            error: 'Failed to generate payment link',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
