import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import { getUnitEffectivePrice } from '@/lib/types/product'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await dbConnect()

        const user = await currentUser()
        const customerEmail = user?.emailAddresses?.[0]?.emailAddress ||
            user?.primaryEmailAddress?.emailAddress ||
            user?.emailAddresses?.find(email => email.verification?.status === 'verified')?.emailAddress

        if (!customerEmail) {
            return NextResponse.json({
                error: 'Customer email is required for order processing. Please ensure your email is verified.'
            }, { status: 400 })
        }

        const { cartItemIds, shippingAddress, customerInfo } = await request.json()

        console.log('Creating direct order for user:', userId, 'with items:', cartItemIds)

        if (!cartItemIds || !shippingAddress) {
            console.error('Missing required fields for order creation:', { cartItemIds, shippingAddress })
            return NextResponse.json({
                error: 'Cart items and shipping address are required'
            }, { status: 400 })
        }

        // Validate required fields
        if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
            return NextResponse.json({ error: 'Cart items are required' }, { status: 400 })
        }

        if (!shippingAddress) {
            return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
        }

        // Fetch real product data from database and validate stock
        const orderItems = []
        let subtotal = 0

        for (const cartItem of cartItemIds) {
            // Handle custom products differently
            if (cartItem.productId?.startsWith('custom-')) {
                const quantity = parseInt(cartItem.quantity) || 1
                if (quantity <= 0) {
                    return NextResponse.json({
                        error: `Invalid quantity for custom item: ${quantity}`
                    }, { status: 400 })
                }

                // For custom products, use the data from cart item directly
                // Price should be 0 + any engraving fees until admin sets pricing
                const customPrice = cartItem.price || cartItem.effectivePrice || 0

                const itemTotal = customPrice * quantity
                subtotal += itemTotal

                orderItems.push({
                    productId: cartItem.productId,
                    unitId: cartItem.unitId || 'custom',
                    name: cartItem.name || 'Custom Item',
                    price: customPrice,
                    quantity: quantity,
                    size: cartItem.size || '',
                    color: cartItem.color || 'Custom',
                    image: cartItem.images?.[0] || '/images/custom-placeholder.jpg',
                    isCustom: true,
                    customDetails: cartItem.customDetails || {}
                })

                continue // Skip regular product processing for custom items
            }

            // Regular product processing
            const product = await Product.findById(cartItem.productId)

            if (!product) {
                return NextResponse.json({
                    error: `Product not found: ${cartItem.productId}`
                }, { status: 404 })
            }

            // Validate quantity
            const quantity = parseInt(cartItem.quantity) || 1
            if (quantity <= 0) {
                return NextResponse.json({
                    error: `Invalid quantity for ${product.name}: ${quantity}`
                }, { status: 400 })
            }

            let currentPrice = 0
            let availableStock = 0
            let unitData = null

            // Handle products with units vs legacy products
            if (product.units && product.units.length > 0 && cartItem.unitId) {
                // Find the specific unit
                const unit = product.units.find(u => u.unitId === cartItem.unitId)

                if (!unit) {
                    return NextResponse.json({
                        error: `Unit not found for product ${product.name}: ${cartItem.unitId}`
                    }, { status: 404 })
                }

                currentPrice = getUnitEffectivePrice(product, unit)
                availableStock = unit.stock || 0
                unitData = unit

                console.log(`Unit pricing for ${product.name} (${cartItem.unitId}): $${currentPrice}, stock: ${availableStock}`)
            } else {
                // Legacy product without units
                const originalPrice = parseFloat(product.price) || 0
                const salePrice = product.salePrice ? parseFloat(product.salePrice) : null
                currentPrice = salePrice && salePrice < originalPrice ? salePrice : originalPrice
                availableStock = product.stock || 0

                console.log(`Legacy pricing for ${product.name}: $${currentPrice}, stock: ${availableStock}`)
            }

            // Validate price
            if (isNaN(currentPrice) || currentPrice <= 0) {
                return NextResponse.json({
                    error: `Invalid price for product ${product.name}: ${currentPrice}`
                }, { status: 400 })
            }

            // Check stock
            if (availableStock < quantity) {
                return NextResponse.json({
                    error: `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${quantity}`
                }, { status: 400 })
            }

            const itemTotal = currentPrice * quantity
            subtotal += itemTotal

            // Get product image
            let productImage = ''
            if (unitData?.images && unitData.images.length > 0) {
                productImage = unitData.images[0]
            } else if (product.images && product.images.length > 0) {
                productImage = product.images[0]
            }

            orderItems.push({
                productId: product._id.toString(),
                unitId: cartItem.unitId || product._id.toString(),
                name: product.name,
                price: currentPrice,
                quantity: quantity,
                size: cartItem.size || '',
                color: cartItem.color || '',
                image: productImage || '/placeholder-image.png'
            })
        }

        // Validate subtotal
        if (isNaN(subtotal) || subtotal <= 0) {
            return NextResponse.json({
                error: 'Invalid order total calculated'
            }, { status: 400 })
        }

        // No shipping calculations - will be done during admin review
        const shippingCost = 0
        const tax = 0
        const total = subtotal // Only items total for now

        // Map shipping address
        const mappedShippingAddress = {
            name: shippingAddress.name,
            line1: shippingAddress.line1,
            line2: shippingAddress.line2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            postal_code: shippingAddress.postalCode,
            country: shippingAddress.country || 'US',
            phone: shippingAddress.phone || '',
            email: customerEmail,
            residential: shippingAddress.residential || true
        }

        // Generate order number as backup
        const orderCount = await Order.countDocuments()
        const orderNumber = `ORD-${Date.now()}-${String(orderCount + 1).padStart(4, '0')}`

        // Create order
        const newOrder = {
            orderNumber, // Explicitly set order number
            userId,
            items: orderItems,
            subtotal: parseFloat(subtotal.toFixed(2)),
            shippingCost,
            tax,
            total: parseFloat(total.toFixed(2)),
            status: 'pending_approval',
            paymentStatus: 'pending_approval',
            shippingAddress: mappedShippingAddress,
            billingAddress: mappedShippingAddress,
            shippingMethod: 'TBD',
            customerEmail,
            customerPhone: shippingAddress.phone || user?.phoneNumbers?.[0]?.phoneNumber || '',
            adminApproval: {
                isApproved: false,
                adminNotes: `Order created from cart. Customer: ${customerInfo?.name || 'N/A'} (${customerEmail}). Items ordered at current prices. Admin needs to calculate shipping, tax, and final total before processing.`
            },
            emailHistory: [{
                sentAt: new Date(),
                sentBy: 'system',
                type: 'confirmation',
                subject: 'Order Received - Under Review',
                content: `Thank you for your order! We have received your order and it is currently being reviewed by our team.

Order Details:
- Items: ${orderItems.length} item(s)
- Items Total: $${subtotal.toFixed(2)}

We will contact you within 24 hours via email with:
- Order acceptance confirmation
- Final pricing including shipping and tax
- Payment instructions
- Estimated shipping timeframe

Thank you for choosing Butterflies Beading!`
            }]
        }

        console.log('Creating order with data:', {
            userId,
            orderNumber,
            itemsCount: orderItems.length,
            subtotal,
            total,
            customerEmail
        })

        const savedOrder = await Order.create(newOrder)

        console.log(`Order created: ${savedOrder.orderNumber} for user ${userId}`)

        return NextResponse.json({
            success: true,
            orderId: savedOrder._id,
            orderNumber: savedOrder.orderNumber,
            message: 'Order created successfully and is under review',
            customerEmail,
            itemsTotal: subtotal
        })

    } catch (error) {
        console.error('Error creating direct order:', error)
        return NextResponse.json({
            error: 'Failed to create order',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
