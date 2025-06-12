import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import { normalizeCategory } from '@/lib/types/product'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const user = await currentUser()
        // Enhanced email collection - try multiple sources
        const customerEmail = user?.emailAddresses?.[0]?.emailAddress ||
            user?.primaryEmailAddress?.emailAddress ||
            user?.emailAddresses?.find(email => email.verification?.status === 'verified')?.emailAddress

        if (!customerEmail) {
            return NextResponse.json({
                error: 'Customer email is required for order processing. Please ensure your email is verified.'
            }, { status: 400 })
        }

        const orderData = await request.json()

        // Validate and normalize category
        if (orderData.category) {
            const normalizedCategory = normalizeCategory(orderData.category)
            if (!normalizedCategory) {
                return NextResponse.json({
                    error: 'Invalid category. Must be one of: ring, earring, bracelet, necklace (singular forms only)'
                }, { status: 400 })
            }
            orderData.category = normalizedCategory
        }

        // Validate required fields
        if (!orderData.category || !orderData.title || !orderData.sizes || !orderData.shippingAddress) {
            return NextResponse.json({
                error: 'Missing required fields: category, title, sizes, and shippingAddress are required'
            }, { status: 400 })
        }

        // Map the shipping address from custom order format to Order schema format
        const mappedShippingAddress = {
            name: orderData.shippingAddress.name,
            line1: orderData.shippingAddress.line1,
            line2: orderData.shippingAddress.line2 || '',
            city: orderData.shippingAddress.city,
            state: orderData.shippingAddress.state,
            postal_code: orderData.shippingAddress.postalCode,
            country: orderData.shippingAddress.country || 'US',
            phone: orderData.shippingAddress.phone || '',
            email: orderData.shippingAddress.email || customerEmail,
        }

        // Create a custom order with special pricing structure
        const customOrder = {
            userId,
            items: [{
                productId: new Date().getTime().toString(), // Temporary ID for custom items
                unitId: 'custom',
                name: `${orderData.title} - ${orderData.sizes}`,
                price: 0, // Will be set after admin review
                quantity: orderData.quantity || 1,
                size: orderData.sizes,
                color: orderData.engraving ? 'Custom Engraved' : 'Standard',
                image: '/images/custom-placeholder.jpg'
            }],
            subtotal: 0, // Will be calculated after admin review
            shippingCost: 0, // Will be calculated after admin review
            tax: 0, // Will be calculated after admin review
            total: 0, // Will be calculated after admin review
            status: 'pending_approval',
            paymentStatus: 'pending_approval',
            shippingAddress: mappedShippingAddress,
            billingAddress: mappedShippingAddress, // Use same as shipping for custom orders
            shippingMethod: 'custom_quote',
            customerEmail, // Ensure email is always included
            customerPhone: orderData.shippingAddress.phone || user?.phoneNumbers?.[0]?.phoneNumber || '',
            adminApproval: {
                isApproved: false,
                adminNotes: `Custom Order Details:
Category: ${orderData.category}
Title: ${orderData.title}
Description: ${orderData.description || ''}
Sizes: ${orderData.sizes}
Engraving: ${orderData.engraving || 'None'}
Quantity: ${orderData.quantity || 1}
Customer Notes: ${orderData.notes || 'None'}

Customer Contact: ${customerEmail}
Shipping: ${mappedShippingAddress.name}, ${mappedShippingAddress.line1}, ${mappedShippingAddress.city}, ${mappedShippingAddress.state} ${mappedShippingAddress.postal_code}`
            },
            emailHistory: [{
                sentAt: new Date(),
                sentBy: 'system',
                type: 'confirmation',
                subject: 'Custom Order Request Received',
                content: `Your custom order request has been received and is pending review. We will contact you within 24 hours with pricing and timeline details.

Order Details:
- ${orderData.title}
- Sizes: ${orderData.sizes}
- Quantity: ${orderData.quantity || 1}
${orderData.engraving ? `- Engraving: ${orderData.engraving}` : ''}
${orderData.notes ? `- Notes: ${orderData.notes}` : ''}

Thank you for choosing Butterflies Beading!`
            }]
        }

        const savedOrder = await Order.create(customOrder)

        return NextResponse.json({
            success: true,
            orderId: savedOrder._id,
            orderNumber: savedOrder.orderNumber,
            message: 'Custom order request submitted successfully',
            customerEmail // Include in response for confirmation
        })

    } catch (error) {
        console.error('Error creating custom order:', error)
        return NextResponse.json({
            error: 'Failed to create custom order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
