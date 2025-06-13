import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Order, { IOrder } from '@/lib/models/Order';
import { logTaxUpdateEmail } from '@/utils/email-collection';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        const adminUser = await currentUser();
        const resolvedParams = await params;

        if (!userId || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = adminUser?.privateMetadata?.role as string;
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { newTaxAmount, setTaxFlag } = await request.json();
        const orderId = resolvedParams.id;

        if (newTaxAmount === undefined || newTaxAmount === null || isNaN(newTaxAmount) || newTaxAmount < 0) {
            return NextResponse.json({ error: 'Invalid tax amount provided' }, { status: 400 });
        }

        await dbConnect();

        const order = await Order.findById(orderId) as IOrder | null;
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const oldTax = order.tax || 0;
        const oldTotal = order.total;

        // Update tax and recalculate total
        order.tax = parseFloat(newTaxAmount);
        order.isTaxSet = true; // Always set this flag when tax is updated
        order.total = (order.subtotal || 0) + (order.shippingCost || 0) + order.tax;

        // Set the tax flag if requested
        if (setTaxFlag) {
            order.isTaxSet = true;
        }

        // Add to email history if there's a significant change
        if (Math.abs(oldTax - order.tax) > 0.01) {
            order.emailHistory = order.emailHistory || [];
            order.emailHistory.push({
                sentBy: userId,
                type: 'tax_updated',
                subject: `Tax Updated for Order ${order.orderNumber}`,
                content: `Tax amount updated from $${oldTax.toFixed(2)} to $${order.tax.toFixed(2)}. New total: $${order.total.toFixed(2)}`,
                sentAt: new Date(),
            });
        }

        await order.save();

        return NextResponse.json({
            success: true,
            message: 'Tax updated successfully',
            order: order,
            oldTotal: oldTotal,
            newTotal: order.total
        });

    } catch (error) {
        console.error('Error updating tax:', error);
        return NextResponse.json({
            error: 'Failed to update tax',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
