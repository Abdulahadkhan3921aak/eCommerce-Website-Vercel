import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import { normalizeCategory } from '@/lib/types/product'
import { extractCustomerEmail } from '@/utils/email-collection'

// Generate unique order number for custom orders
const generateOrderNumber = () => {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CO-${timestamp.slice(-6)}-${random}` // CO for Custom Order
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const user = await currentUser()
        const customerEmail = extractCustomerEmail(user)

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

        // Generate unique order number
        const orderNumber = generateOrderNumber()

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
            orderNumber, // Add the generated order number
            userId,
            isCustomOrder: true, // Add custom order flag
            customOrderDetails: {
                category: orderData.category,
                title: orderData.title,
                description: orderData.description || '',
                sizes: orderData.sizes,
                engraving: orderData.engraving || '',
                notes: orderData.notes || '',
                images: orderData.images || [] // Add images to custom order details
            },
            items: [{
                productId: `custom-${new Date().getTime()}`, // Unique ID for custom items
                unitId: 'custom',
                name: `${orderData.title} - ${orderData.sizes}`,
                price: 0, // Will be set after admin review
                quantity: orderData.quantity || 1,
                size: orderData.sizes,
                color: orderData.engraving ? 'Custom Engraved' : 'Standard',
                image: orderData.images && orderData.images.length > 0 ? orderData.images[0] : '/images/custom-placeholder.jpg',
                isCustom: true, // Mark as custom item
                customDetails: {
                    category: orderData.category,
                    title: orderData.title,
                    description: orderData.description || '',
                    engraving: orderData.engraving || '',
                    notes: orderData.notes || '',
                    images: orderData.images || []
                }
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
                adminNotes: `🎨 CUSTOM ORDER DETAILS:
Category: ${orderData.category}
Title: ${orderData.title}
Description: ${orderData.description || 'None provided'}
Sizes: ${orderData.sizes}
Engraving: ${orderData.engraving || 'None'}
Quantity: ${orderData.quantity || 1}
Customer Notes: ${orderData.notes || 'None'}
${orderData.images && orderData.images.length > 0 ? `Images: ${orderData.images.length} uploaded` : 'Images: None uploaded'}

📞 Customer Contact: ${customerEmail}
📍 Shipping: ${mappedShippingAddress.name}, ${mappedShippingAddress.line1}, ${mappedShippingAddress.city}, ${mappedShippingAddress.state} ${mappedShippingAddress.postal_code}

⚠️ ADMIN ACTION REQUIRED:
- Set custom item pricing
- Calculate total with engraving fees (${orderData.engraving ? '$15.00' : '$0.00'})
- Provide quote with timeline
💰 Custom Pricing: Requires admin review and quote`
            },
            emailHistory: [{
                sentAt: new Date(),
                sentBy: 'system',
                type: 'confirmation',
                subject: 'Custom Order Request Received',
                content: `Your custom order request has been received and is pending review. We will contact you within 24 hours with pricing and timeline details.

Order Number: ${orderNumber}

Order Details:
- ${orderData.title}
- Sizes: ${orderData.sizes}
- Quantity: ${orderData.quantity || 1}
${orderData.engraving ? `- Engraving: ${orderData.engraving}` : ''}
${orderData.notes ? `- Notes: ${orderData.notes}` : ''}
${orderData.images && orderData.images.length > 0 ? `- Reference Images: ${orderData.images.length} uploaded` : ''}

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
