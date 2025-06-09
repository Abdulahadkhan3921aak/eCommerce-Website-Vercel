import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { userId } = await auth()
        const user = await currentUser()

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { subject, content } = await request.json()
        const orderId = params.id

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 })
        }

        await dbConnect()

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Add email to history
        order.emailHistory.push({
            sentBy: userId,
            subject: subject,
            content: content,
            type: 'custom'
        })

        await order.save()

        // TODO: Send actual email to customer using your preferred email service
        // Example: await sendEmail(order.customerEmail, subject, content)

        return NextResponse.json({
            success: true,
            message: 'Email sent successfully'
        })
    } catch (error) {
        console.error('Error sending email:', error)
        return NextResponse.json({
            error: 'Failed to send email',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
