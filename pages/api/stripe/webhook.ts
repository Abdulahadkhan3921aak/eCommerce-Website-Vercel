import Stripe from 'stripe';
import { buffer } from 'micro';
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
    api: {
        bodyParser: false,
    },
};

interface OrderDocument {
    _id: string;
    customerEmail: string;
    customerName: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    total: number;
    status: string;
    paidAt?: Date;
    updatedAt: Date;
    paymentIntentId?: string;
    stripeSessionId?: string;
}

interface EmailData {
    to: string;
    subject: string;
    template: string;
    data: {
        orderNumber: string;
        customerName: string;
        items: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
        total: number;
        paidAt: Date;
    };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        try {
            // Connect to database
            const { db } = await dbConnect();

            // Find order using session ID or metadata
            const orderId = session.metadata?.orderId || session.client_reference_id;

            if (!orderId) {
                console.error('No order ID found in session metadata');
                return res.status(400).json({ error: 'No order ID found' });
            }

            // Update order status to paid
            const result = await db.collection('orders').updateOne(
                { _id: orderId },
                {
                    $set: {
                        status: 'paid',
                        paymentIntentId: session.payment_intent as string,
                        stripeSessionId: session.id,
                        paidAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                console.error('Order not found:', orderId);
                return res.status(404).json({ error: 'Order not found' });
            }

            // Get order details for email
            const order = await db.collection('orders').findOne({ _id: orderId }) as OrderDocument | null;

            // Optional: Send confirmation email
            if (order && order.customerEmail) {
                await sendConfirmationEmail(order);
            }

            console.log('Order updated successfully:', orderId);
            res.status(200).json({ received: true });

        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        // Return 200 for unhandled event types
        res.status(200).json({ received: true });
    }
}

async function sendConfirmationEmail(order: OrderDocument): Promise<void> {
    try {
        // Implementation depends on your email service (SendGrid, Nodemailer, etc.)
        // Example with a hypothetical email service:

        const emailData: EmailData = {
            to: order.customerEmail,
            subject: 'Order Confirmation - Payment Received',
            template: 'order-confirmation',
            data: {
                orderNumber: order._id,
                customerName: order.customerName,
                items: order.items,
                total: order.total,
                paidAt: order.paidAt!
            }
        };

        // Replace with your actual email service implementation
        // await emailService.send(emailData);

        console.log('Confirmation email sent to:', order.customerEmail);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        // Don't throw error here to avoid webhook retry
    }
}
