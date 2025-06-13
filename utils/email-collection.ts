import { User } from '@clerk/nextjs/server'
import { IOrder } from '@/lib/models/Order'

/**
 * Email branding and styling constants
 */
const EMAIL_THEME = {
    primaryColor: '#9333ea', // Purple-600 from Tailwind
    secondaryColor: '#7c3aed', // Purple-700
    successColor: '#10b981', // Emerald-500
    warningColor: '#f59e0b', // Amber-500
    dangerColor: '#ef4444', // Red-500
    lightBg: '#f8fafc', // Slate-50
    darkBg: '#1f2937', // Gray-800
    textPrimary: '#1f2937', // Gray-800
    textSecondary: '#6b7280', // Gray-500
    borderColor: '#e5e7eb', // Gray-200
    fontFamily: 'Inter, Arial, sans-serif'
}

/**
 * Base email template with website branding
 */
function getBaseEmailTemplate(title: string, content: string, preheader?: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: ${EMAIL_THEME.fontFamily}; line-height: 1.6; color: ${EMAIL_THEME.textPrimary}; }
        .email-container { max-width: 600px; margin: 0 auto; background: white; }
        .email-header { background: linear-gradient(135deg, ${EMAIL_THEME.primaryColor} 0%, ${EMAIL_THEME.secondaryColor} 100%); padding: 30px 20px; text-align: center; }
        .email-logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .email-tagline { color: rgba(255,255,255,0.9); font-size: 14px; }
        .email-content { padding: 30px 20px; }
        .btn-primary { display: inline-block; background: ${EMAIL_THEME.primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
        .btn-primary:hover { background: ${EMAIL_THEME.secondaryColor}; }
        .card { background: ${EMAIL_THEME.lightBg}; border: 1px solid ${EMAIL_THEME.borderColor}; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .success-card { background: #ecfdf5; border-color: ${EMAIL_THEME.successColor}; border-left: 4px solid ${EMAIL_THEME.successColor}; }
        .warning-card { background: #fff7ed; border-color: ${EMAIL_THEME.warningColor}; border-left: 4px solid ${EMAIL_THEME.warningColor}; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; }
        .table th { background: ${EMAIL_THEME.lightBg}; font-weight: 600; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 600; }
        .text-sm { font-size: 14px; }
        .text-lg { font-size: 18px; }
        .mb-4 { margin-bottom: 16px; }
        .mt-4 { margin-top: 16px; }
        .email-footer { background: ${EMAIL_THEME.darkBg}; color: white; padding: 30px 20px; text-align: center; }
        .email-footer a { color: ${EMAIL_THEME.primaryColor}; text-decoration: none; }
        @media (max-width: 600px) {
            .email-container { width: 100% !important; }
            .email-content { padding: 20px 15px !important; }
            .table { font-size: 14px; }
        }
    </style>
</head>
<body>
    ${preheader ? `<div style="display: none; font-size: 1px; color: transparent; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheader}</div>` : ''}
    
    <div class="email-container">
        <!-- Header -->
        <div class="email-header">
            <div class="email-logo">🦋 Butterflies Beading</div>
            <div class="email-tagline">Handmade Jewelry & Custom Designs</div>
        </div>
        
        <!-- Content -->
        <div class="email-content">
            ${content}
        </div>
        
        <!-- Footer -->
        <div class="email-footer">
            <div style="margin-bottom: 20px;">
                <h3 style="color: white; margin-bottom: 10px;">Stay Connected</h3>
                <div style="margin-bottom: 15px;">
                    <a href="#" style="color: ${EMAIL_THEME.primaryColor}; margin: 0 10px; text-decoration: none;">Facebook</a>
                    <a href="#" style="color: ${EMAIL_THEME.primaryColor}; margin: 0 10px; text-decoration: none;">Instagram</a>
                    <a href="#" style="color: ${EMAIL_THEME.primaryColor}; margin: 0 10px; text-decoration: none;">Pinterest</a>
                </div>
            </div>
            
            <div style="border-top: 1px solid #374151; padding-top: 20px; color: #9ca3af; font-size: 14px;">
                <p><strong>Butterflies Beading</strong></p>
                <p>123 Artisan Way, Craftsville, NY 10001</p>
                <p>Email: <a href="mailto:info@butterfliesbeading.com" style="color: ${EMAIL_THEME.primaryColor};">info@butterfliesbeading.com</a> | Phone: (555) 123-4567</p>
                <p style="margin-top: 15px; font-size: 12px;">
                    © ${new Date().getFullYear()} Butterflies Beading. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Utility function to extract customer email from various sources
 */
export function extractCustomerEmail(user: User | null): string | null {
    if (!user) return null

    const emailSources = [
        user.primaryEmailAddress?.emailAddress,
        user.emailAddresses?.find(email => email.verification?.status === 'verified')?.emailAddress,
        user.emailAddresses?.[0]?.emailAddress
    ]

    return emailSources.find(email => email && isValidEmail(email)) || null
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Ensure customer email is present for order processing
 */
export function validateCustomerEmail(email: string | null | undefined): { isValid: boolean; error?: string } {
    if (!email) {
        return {
            isValid: false,
            error: 'Customer email is required for order processing. Please ensure your email is verified.'
        }
    }

    if (!isValidEmail(email)) {
        return {
            isValid: false,
            error: 'Please provide a valid email address.'
        }
    }

    return { isValid: true }
}

/**
 * Standardize shipping address with email
 */
export function standardizeShippingAddress(address: any, customerEmail: string) {
    return {
        name: address.name || '',
        line1: address.line1 || '',
        line2: address.line2 || '',
        city: address.city || '',
        state: address.state || '',
        postal_code: address.postalCode || address.postal_code || '',
        country: address.country || 'US',
        phone: address.phone || '',
        email: customerEmail // Always use verified customer email
    }
}

/**
 * Order Accepted Email - Professional HTML template
 */
export function logOrderAcceptedEmail(order: IOrder, adminUserId: string) {
    const subject = `🎉 Order ${order.orderNumber} Accepted - Thank You for Your Purchase!`

    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor};">
                <div style="font-weight: 600; color: ${EMAIL_THEME.textPrimary};">${item.name}</div>
                ${item.size ? `<div style="font-size: 14px; color: ${EMAIL_THEME.textSecondary};">Size: ${item.size}</div>` : ''}
                ${item.color ? `<div style="font-size: 14px; color: ${EMAIL_THEME.textSecondary};">Color: ${item.color}</div>` : ''}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; text-align: center; font-weight: 600;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; text-align: right; font-weight: 600;">$${item.price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; text-align: right; font-weight: 600; color: ${EMAIL_THEME.primaryColor};">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('')

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, ${EMAIL_THEME.successColor} 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 32px; font-weight: bold;">✅ Order Accepted!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Your order has been accepted and is being prepared with care</p>
            </div>
        </div>
        
        <div class="card">
            <h2 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 15px; font-size: 22px;">📋 Order Details</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                    <strong style="color: ${EMAIL_THEME.textSecondary};">Order Number:</strong><br>
                    <span style="font-size: 18px; font-weight: 600; color: ${EMAIL_THEME.primaryColor};">${order.orderNumber}</span>
                </div>
                <div>
                    <strong style="color: ${EMAIL_THEME.textSecondary};">Order Date:</strong><br>
                    <span style="font-size: 16px;">${new Date(order.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</span>
                </div>
            </div>
        </div>

        <div style="margin: 30px 0;">
            <h3 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 20px; font-size: 20px;">🛍️ Items in Your Order</h3>
            <table class="table" style="border: 1px solid ${EMAIL_THEME.borderColor}; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: linear-gradient(135deg, ${EMAIL_THEME.primaryColor} 0%, ${EMAIL_THEME.secondaryColor} 100%); color: white;">
                        <th style="padding: 15px; border: none;">Item Details</th>
                        <th style="padding: 15px; border: none; text-align: center;">Qty</th>
                        <th style="padding: 15px; border: none; text-align: right;">Price</th>
                        <th style="padding: 15px; border: none; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-color: #0ea5e9;">
            <h3 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 20px; font-size: 20px;">💰 Order Summary</h3>
            <div style="space-y: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: ${EMAIL_THEME.textSecondary};">Subtotal:</span>
                    <span style="font-weight: 600;">$${order.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: ${EMAIL_THEME.textSecondary};">Tax:</span>
                    <span style="font-weight: 600;">$${order.tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: ${EMAIL_THEME.textSecondary};">Shipping:</span>
                    <span style="font-weight: 600;">${order.shippingCost ? '$' + order.shippingCost.toFixed(2) : 'TBD'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid ${EMAIL_THEME.primaryColor}; margin-top: 10px;">
                    <span style="font-size: 20px; font-weight: bold;">Total:</span>
                    <span style="font-size: 20px; font-weight: bold; color: ${EMAIL_THEME.primaryColor};">$${order.total.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #fef3e2 0%, #fde68a 100%); border-color: ${EMAIL_THEME.warningColor};">
            <h3 style="color: #92400e; margin-bottom: 15px; font-size: 20px;">📍 Shipping Address</h3>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #fed7aa;">
                <div style="font-weight: 600; color: ${EMAIL_THEME.textPrimary}; margin-bottom: 10px;">${order.shippingAddress.name}</div>
                <div style="color: ${EMAIL_THEME.textSecondary}; line-height: 1.5;">
                    ${order.shippingAddress.line1}<br>
                    ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br>' : ''}
                    ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}<br>
                    ${order.shippingAddress.country}
                </div>
            </div>
        </div>

        <div class="success-card" style="margin: 30px 0;">
            <h3 style="color: #065f46; margin-bottom: 15px; font-size: 20px;">🚀 What Happens Next?</h3>
            <div style="color: #047857;">
                <div style="display: flex; align-items: center; margin: 12px 0;">
                    <span style="background: ${EMAIL_THEME.successColor}; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold;">1</span>
                    <span><strong>Order Preparation:</strong> We're carefully preparing your handmade items</span>
                </div>
                <div style="display: flex; align-items: center; margin: 12px 0;">
                    <span style="background: ${EMAIL_THEME.successColor}; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold;">2</span>
                    <span><strong>Shipping Setup:</strong> We'll finalize shipping costs and send tracking info</span>
                </div>
                <div style="display: flex; align-items: center; margin: 12px 0;">
                    <span style="background: ${EMAIL_THEME.successColor}; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold;">3</span>
                    <span><strong>Payment Link:</strong> You'll receive a secure payment link when ready to ship</span>
                </div>
                <div style="display: flex; align-items: center; margin: 12px 0;">
                    <span style="background: ${EMAIL_THEME.successColor}; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold;">4</span>
                    <span><strong>Delivery:</strong> Your beautiful jewelry will be on its way to you!</span>
                </div>
            </div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <div style="background: linear-gradient(135deg, ${EMAIL_THEME.primaryColor} 0%, ${EMAIL_THEME.secondaryColor} 100%); color: white; padding: 25px; border-radius: 12px;">
                <h3 style="margin: 0 0 10px 0; color: white;">💜 Thank You for Choosing Butterflies Beading!</h3>
                <p style="margin: 0; opacity: 0.9;">We're honored to create beautiful handmade jewelry just for you. Each piece is crafted with love and attention to detail.</p>
            </div>
        </div>

        <div style="text-align: center; padding: 20px; background: ${EMAIL_THEME.lightBg}; border-radius: 8px; margin-top: 30px;">
            <p style="color: ${EMAIL_THEME.textSecondary}; margin: 0;">Questions about your order?</p>
            <p style="margin: 10px 0 0 0;">
                <a href="mailto:info@butterfliesbeading.com" style="color: ${EMAIL_THEME.primaryColor}; text-decoration: none; font-weight: 600;">Contact our friendly support team</a>
            </p>
        </div>
    `;

    console.log(`📧 Order Accepted Email Generated for ${order.customerEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Admin: ${adminUserId}`);

    // Return proper email object structure
    return {
        to: order.customerEmail,
        subject,
        html: getBaseEmailTemplate('Order Accepted', content, 'Your order has been accepted and is being prepared'),
        text: generateOrderAcceptedTextVersion(order)
    }
}

/**
 * Payment Link Email - Secure and professional
 */
export function logPaymentLinkEmail(order: IOrder, paymentLink: string, adminUserId: string) {
    const subject = `💳 Payment Required for Order ${order.orderNumber} - Secure Link Inside`

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 25px; border-radius: 12px;">
                <h1 style="margin: 0; font-size: 32px;">💳 Payment Ready</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Your order is ready for payment and shipping</p>
            </div>
        </div>

        <div class="card">
            <h2 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 15px;">📦 Order Summary</h2>
            <div style="background: white; border: 1px solid ${EMAIL_THEME.borderColor}; border-radius: 8px; padding: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Order Number:</strong><br>
                        <span style="font-size: 18px; font-weight: 600; color: ${EMAIL_THEME.primaryColor};">${order.orderNumber}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Total Amount:</strong><br>
                        <span style="font-size: 24px; font-weight: bold; color: ${EMAIL_THEME.primaryColor};">$${order.total.toFixed(2)}</span>
                    </div>
                </div>
                
                <div style="background: ${EMAIL_THEME.lightBg}; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>Subtotal:</span>
                        <span style="font-weight: 600;">$${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>Tax:</span>
                        <span style="font-weight: 600;">$${order.tax.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                        <span>Shipping:</span>
                        <span style="font-weight: 600;">${order.shippingCost ? '$' + order.shippingCost.toFixed(2) : 'FREE'}</span>
                    </div>
                </div>
            </div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; color: white;">
                <h3 style="margin: 0 0 15px 0; color: white;">🔒 Secure Payment Link</h3>
                <p style="margin: 0 0 20px 0; opacity: 0.9;">Click the button below to complete your payment securely via Stripe</p>
                <a href="${paymentLink}" class="btn-primary" style="background: white; color: #10b981; padding: 15px 30px; font-size: 18px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Complete Payment - $${order.total.toFixed(2)}
                </a>
                <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.8;">⏰ This link expires in 24 hours for your security</p>
            </div>
        </div>

        <div class="warning-card">
            <h3 style="color: #92400e; margin-bottom: 15px;">🛡️ Payment Security Information</h3>
            <div style="color: #92400e;">
                <p style="margin: 8px 0;">✅ Your payment is processed securely through Stripe</p>
                <p style="margin: 8px 0;">🔐 We never store your credit card information</p>
                <p style="margin: 8px 0;">📱 The link works on desktop and mobile devices</p>
                <p style="margin: 8px 0;">⏰ Link expires in 24 hours for security</p>
            </div>
        </div>

        ${order.shippoShipment?.trackingNumber ? `
        <div class="success-card">
            <h3 style="color: #065f46; margin-bottom: 15px;">📦 Shipping Information</h3>
            <div style="color: #047857;">
                <p style="margin: 8px 0;"><strong>Carrier:</strong> ${order.shippoShipment.carrier}</p>
                <p style="margin: 8px 0;"><strong>Service:</strong> ${order.shippoShipment.serviceLevelName}</p>
                <p style="margin: 8px 0;"><strong>Tracking Number:</strong> ${order.shippoShipment.trackingNumber}</p>
                <p style="margin: 8px 0;"><strong>Estimated Delivery:</strong> ${order.shippoShipment.estimatedDeliveryDays} business days</p>
            </div>
        </div>
        ` : ''}

        <div style="text-align: center; padding: 20px; background: ${EMAIL_THEME.lightBg}; border-radius: 8px; margin-top: 30px;">
            <p style="color: ${EMAIL_THEME.textSecondary}; margin: 0 0 10px 0;">Having trouble with the payment link?</p>
            <p style="margin: 0;">
                <a href="mailto:info@butterfliesbeading.com" style="color: ${EMAIL_THEME.primaryColor}; text-decoration: none; font-weight: 600;">Contact our support team</a>
            </p>
        </div>
    `

    console.log(`📧 Payment Link Email Generated for ${order.customerEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Payment Link: ${paymentLink}`)
    console.log(`Admin: ${adminUserId}`)

    return {
        to: order.customerEmail,
        subject,
        html: getBaseEmailTemplate('Payment Required', content, 'Complete your secure payment to finalize your order'),
        text: generatePaymentLinkTextVersion(order, paymentLink)
    }
}

/**
 * Shipping Setup Email - Professional notification
 */
export function logShippingUpdateEmail(order: IOrder, adminUserId: string, updateDetails: string) {
    const subject = `📦 Shipping Update for Order ${order.orderNumber}`

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 25px; border-radius: 12px;">
                <h1 style="margin: 0; font-size: 32px;">📦 Shipping Update</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Your order shipping details have been updated</p>
            </div>
        </div>

        <div class="card">
            <h2 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 15px;">📋 Order Information</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <strong style="color: ${EMAIL_THEME.textSecondary};">Order Number:</strong><br>
                    <span style="font-size: 18px; font-weight: 600; color: ${EMAIL_THEME.primaryColor};">${order.orderNumber}</span>
                </div>
                <div>
                    <strong style="color: ${EMAIL_THEME.textSecondary};">Order Date:</strong><br>
                    <span>${new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-color: #3b82f6;">
            <h3 style="color: #1d4ed8; margin-bottom: 15px;">📦 Shipping Update Details</h3>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #93c5fd;">
                <p style="color: ${EMAIL_THEME.textPrimary}; line-height: 1.6; margin: 0;">${updateDetails}</p>
            </div>
        </div>

        ${order.shippoShipment?.trackingNumber ? `
        <div class="success-card">
            <h3 style="color: #065f46; margin-bottom: 15px;">🚚 Current Shipping Information</h3>
            <div style="color: #047857;">
                <p style="margin: 8px 0;"><strong>Carrier:</strong> ${order.shippoShipment.carrier}</p>
                <p style="margin: 8px 0;"><strong>Service:</strong> ${order.shippoShipment.serviceLevelName}</p>
                <p style="margin: 8px 0;"><strong>Tracking Number:</strong> ${order.shippoShipment.trackingNumber}</p>
                ${order.shippoShipment.estimatedDeliveryDays ?
                `<p style="margin: 8px 0;"><strong>Estimated Delivery:</strong> ${order.shippoShipment.estimatedDeliveryDays} business days</p>` :
                ''
            }
            </div>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
            <div style="background: ${EMAIL_THEME.lightBg}; padding: 20px; border-radius: 8px; border: 1px solid ${EMAIL_THEME.borderColor};">
                <h3 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 10px;">Need Help?</h3>
                <p style="color: ${EMAIL_THEME.textSecondary}; margin: 0 0 15px 0;">If you have any questions about your shipping update, we're here to help.</p>
                <a href="mailto:info@butterfliesbeading.com" class="btn-primary">Contact Support</a>
            </div>
        </div>
    `

    console.log(`📧 Shipping Update Email Generated for ${order.customerEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Update: ${updateDetails}`)
    console.log(`Admin: ${adminUserId}`)

    return {
        to: order.customerEmail,
        subject,
        html: getBaseEmailTemplate('Shipping Update', content, 'Important shipping update for your order'),
        text: generateShippingUpdateTextVersion(order, updateDetails)
    }
}

/**
 * Payment Success Email - Celebration and confirmation
 */
export function logPaymentSuccessEmail(order: IOrder, transactionId: string, adminUserId: string) {
    const subject = `🎉 Payment Successful - Order ${order.orderNumber} Confirmed!`

    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor};">
                <div style="font-weight: 600; color: ${EMAIL_THEME.textPrimary};">${item.name}</div>
                ${item.size ? `<div style="font-size: 14px; color: ${EMAIL_THEME.textSecondary};">Size: ${item.size}</div>` : ''}
                ${item.color ? `<div style="font-size: 14px; color: ${EMAIL_THEME.textSecondary};">Color: ${item.color}</div>` : ''}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; text-align: center; font-weight: 600;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; text-align: right; font-weight: 600;">$${item.price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; text-align: right; font-weight: 600; color: ${EMAIL_THEME.successColor};">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('')

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, ${EMAIL_THEME.successColor} 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; position: relative;">
                <div style="font-size: 60px; margin-bottom: 10px;">🎉</div>
                <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Payment Successful!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Thank you! Your order is confirmed and being processed</p>
            </div>
        </div>
        
        <div class="success-card" style="margin-bottom: 30px;">
            <h2 style="color: #065f46; margin-bottom: 15px; font-size: 22px;">✅ Payment Confirmation</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #a7f3d0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Order Number:</strong><br>
                        <span style="font-size: 18px; font-weight: 600; color: ${EMAIL_THEME.primaryColor};">${order.orderNumber}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Transaction ID:</strong><br>
                        <span style="font-size: 16px; font-weight: 600;">${transactionId}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Payment Date:</strong><br>
                        <span>${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Amount Paid:</strong><br>
                        <span style="font-size: 24px; font-weight: bold; color: ${EMAIL_THEME.successColor};">$${order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div style="margin: 30px 0;">
            <h3 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 20px; font-size: 20px;">🛍️ Order Details</h3>
            <table class="table" style="border: 1px solid ${EMAIL_THEME.borderColor}; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: linear-gradient(135deg, ${EMAIL_THEME.successColor} 0%, #059669 100%); color: white;">
                        <th style="padding: 15px; border: none;">Item Details</th>
                        <th style="padding: 15px; border: none; text-align: center;">Qty</th>
                        <th style="padding: 15px; border: none; text-align: right;">Price</th>
                        <th style="padding: 15px; border: none; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-color: #0ea5e9;">
            <h3 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 20px; font-size: 20px;">💰 Payment Summary</h3>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #7dd3fc;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: ${EMAIL_THEME.textSecondary};">Subtotal:</span>
                    <span style="font-weight: 600;">$${order.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: ${EMAIL_THEME.textSecondary};">Tax:</span>
                    <span style="font-weight: 600;">$${order.tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: ${EMAIL_THEME.textSecondary};">Shipping:</span>
                    <span style="font-weight: 600;">${order.shippingCost ? '$' + order.shippingCost.toFixed(2) : 'FREE'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 3px solid ${EMAIL_THEME.successColor}; margin-top: 15px;">
                    <span style="font-size: 20px; font-weight: bold;">Total Paid:</span>
                    <span style="font-size: 20px; font-weight: bold; color: ${EMAIL_THEME.successColor};">$${order.total.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #fef3e2 0%, #fde68a 100%); border-color: ${EMAIL_THEME.warningColor};">
            <h3 style="color: #92400e; margin-bottom: 15px; font-size: 20px;">📍 Shipping Information</h3>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #fed7aa;">
                <div style="font-weight: 600; color: ${EMAIL_THEME.textPrimary}; margin-bottom: 10px;">${order.shippingAddress.name}</div>
                <div style="color: ${EMAIL_THEME.textSecondary}; line-height: 1.5; margin-bottom: 15px;">
                    ${order.shippingAddress.line1}<br>
                    ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br>' : ''}
                    ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}<br>
                    ${order.shippingAddress.country}
                </div>
                ${order.shippoShipment?.trackingNumber ? `
                    <div style="background: #ecfdf5; padding: 12px; border-radius: 6px; border: 1px solid #a7f3d0;">
                        <div style="color: #047857;">
                            <strong>Tracking Number:</strong> ${order.shippoShipment.trackingNumber}<br>
                            <strong>Carrier:</strong> ${order.shippoShipment.carrier}<br>
                            ${order.shippoShipment.estimatedDeliveryDays ?
                `<strong>Estimated Delivery:</strong> ${order.shippoShipment.estimatedDeliveryDays} business days` :
                ''
            }
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>

        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px; margin: 30px 0;">
            <h3 style="margin: 0 0 20px 0; color: white; font-size: 22px;">🚀 What Happens Next?</h3>
            <div style="opacity: 0.95;">
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <span style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">✅</span>
                    <span><strong>Payment Confirmed</strong> - Your order is now being processed</span>
                </div>
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <span style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">📦</span>
                    <span><strong>Careful Packaging</strong> - We'll prepare your items with love and care</span>
                </div>
                ${order.shippoShipment?.trackingNumber ?
            `<div style="display: flex; align-items: center; margin: 15px 0;">
                        <span style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">🚚</span>
                        <span><strong>Track Your Package</strong> - Use tracking number: ${order.shippoShipment.trackingNumber}</span>
                    </div>` :
            `<div style="display: flex; align-items: center; margin: 15px 0;">
                        <span style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">🚚</span>
                        <span><strong>Tracking Coming</strong> - You'll receive tracking details once shipped</span>
                    </div>`
        }
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <span style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">📧</span>
                    <span><strong>Stay Updated</strong> - We'll email you with shipping and delivery updates</span>
                </div>
            </div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <div style="background: linear-gradient(135deg, ${EMAIL_THEME.primaryColor} 0%, ${EMAIL_THEME.secondaryColor} 100%); color: white; padding: 25px; border-radius: 12px;">
                <h3 style="margin: 0 0 10px 0; color: white; font-size: 24px;">💜 Thank You for Your Purchase!</h3>
                <p style="margin: 0; opacity: 0.95; font-size: 16px;">We're thrilled to create beautiful handmade jewelry for you. Each piece is made with passion and attention to detail. You're going to love it!</p>
            </div>
        </div>

        <div style="text-align: center; padding: 25px; background: ${EMAIL_THEME.lightBg}; border-radius: 8px; margin-top: 30px;">
            <p style="color: ${EMAIL_THEME.textSecondary}; margin: 0 0 15px 0; font-size: 16px;">Need help or have questions?</p>
            <a href="mailto:info@butterfliesbeading.com" class="btn-primary" style="margin-right: 10px;">Email Support</a>
            <a href="tel:+15551234567" class="btn-primary" style="background: transparent; color: ${EMAIL_THEME.primaryColor}; border: 2px solid ${EMAIL_THEME.primaryColor};">Call Us</a>
        </div>
    `

    console.log(`📧 Payment Success Email Generated for ${order.customerEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Transaction ID: ${transactionId}`)
    console.log(`Admin: ${adminUserId}`)

    return {
        to: order.customerEmail,
        subject,
        html: getBaseEmailTemplate('Payment Successful!', content, 'Your payment was successful and your order is confirmed'),
        text: generatePaymentSuccessTextVersion(order, transactionId)
    }
}

/**
 * Tax Update Email
 */
export function logTaxUpdateEmail(order: IOrder, adminUserId: string, oldTax: number, newTax: number, oldTotal: number, newTotal: number) {
    const subject = `📊 Tax Adjustment for Order ${order.orderNumber}`

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, ${EMAIL_THEME.warningColor} 0%, #d97706 100%); color: white; padding: 25px; border-radius: 12px;">
                <h1 style="margin: 0; font-size: 32px;">📊 Tax Adjustment</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Important update regarding your order total</p>
            </div>
        </div>

        <div class="warning-card">
            <h3 style="color: #92400e; margin-bottom: 15px;">⚠️ Order Total Update</h3>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #fed7aa;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Previous Tax:</strong><br>
                        <span style="font-size: 18px; text-decoration: line-through; color: #6b7280;">$${oldTax.toFixed(2)}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">New Tax:</strong><br>
                        <span style="font-size: 18px; font-weight: 600; color: ${EMAIL_THEME.warningColor};">$${newTax.toFixed(2)}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Previous Total:</strong><br>
                        <span style="font-size: 18px; text-decoration: line-through; color: #6b7280;">$${oldTotal.toFixed(2)}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">New Total:</strong><br>
                        <span style="font-size: 24px; font-weight: bold; color: ${EMAIL_THEME.primaryColor};">$${newTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <h3 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 15px;">📋 Order Information</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Adjustment Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div style="background: #fef3e2; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; text-align: center;">
                <strong>Note:</strong> If a payment link was previously sent, it may now be invalid. A new payment link will be provided if necessary.
            </p>
        </div>
    `

    console.log(`📧 Tax Update Email Generated for ${order.customerEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Tax Change: $${oldTax.toFixed(2)} → $${newTax.toFixed(2)}`)
    console.log(`Admin: ${adminUserId}`)

    return {
        to: order.customerEmail,
        subject,
        html: getBaseEmailTemplate('Tax Adjustment', content, 'Important tax adjustment for your order'),
        text: generateTaxUpdateTextVersion(order, oldTax, newTax, oldTotal, newTotal)
    }
}

/**
 * Order Shipped Email - Professional tracking notification
 */
export function logOrderShippedEmail(order: IOrder, adminUserId: string) {
    const subject = `📦 Your Order ${order.orderNumber} Has Shipped!`

    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid ${EMAIL_THEME.borderColor};">
                <div style="font-weight: 600; color: ${EMAIL_THEME.textPrimary};">${item.name}</div>
                ${item.size ? `<div style="font-size: 12px; color: ${EMAIL_THEME.textSecondary};">Size: ${item.size}</div>` : ''}
                ${item.color ? `<div style="font-size: 12px; color: ${EMAIL_THEME.textSecondary};">Color: ${item.color}</div>` : ''}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid ${EMAIL_THEME.borderColor}; text-align: center;">${item.quantity}</td>
        </tr>
    `).join('')

    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px; position: relative;">
                <div style="font-size: 60px; margin-bottom: 10px;">📦</div>
                <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Your Order Has Shipped!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">Your beautiful jewelry is on its way to you</p>
            </div>
        </div>
        
        <div class="card" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-color: ${EMAIL_THEME.successColor};">
            <h2 style="color: #065f46; margin-bottom: 15px; font-size: 22px;">🚚 Shipping Information</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #a7f3d0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Order Number:</strong><br>
                        <span style="font-size: 18px; font-weight: 600; color: ${EMAIL_THEME.primaryColor};">${order.orderNumber}</span>
                    </div>
                    <div>
                        <strong style="color: ${EMAIL_THEME.textSecondary};">Ship Date:</strong><br>
                        <span style="font-size: 16px;">${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</span>
                    </div>
                </div>
                
                ${order.shippoShipment?.trackingNumber ? `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6; margin: 20px 0;">
                    <h3 style="color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px;">📍 Track Your Package</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong style="color: ${EMAIL_THEME.textSecondary};">Carrier:</strong><br>
                            <span style="font-size: 16px; font-weight: 600;">${order.shippoShipment.carrier}</span>
                        </div>
                        <div>
                            <strong style="color: ${EMAIL_THEME.textSecondary};">Service:</strong><br>
                            <span style="font-size: 16px;">${order.shippoShipment.serviceLevelName}</span>
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <strong style="color: ${EMAIL_THEME.textSecondary};">Tracking Number:</strong><br>
                            <span style="font-size: 20px; font-weight: bold; color: #1d4ed8; letter-spacing: 1px;">${order.shippoShipment.trackingNumber}</span>
                        </div>
                        ${order.shippoShipment.estimatedDeliveryDays ? `
                        <div style="grid-column: 1 / -1;">
                            <strong style="color: ${EMAIL_THEME.textSecondary};">Estimated Delivery:</strong><br>
                            <span style="font-size: 16px; color: #047857;">${order.shippoShipment.estimatedDeliveryDays} business days from ship date</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <div style="margin: 30px 0;">
            <h3 style="color: ${EMAIL_THEME.textPrimary}; margin-bottom: 20px; font-size: 20px;">📋 Shipped Items</h3>
            <table class="table" style="border: 1px solid ${EMAIL_THEME.borderColor}; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
                        <th style="padding: 15px; border: none;">Item Details</th>
                        <th style="padding: 15px; border: none; text-align: center;">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #fef3e2 0%, #fde68a 100%); border-color: ${EMAIL_THEME.warningColor};">
            <h3 style="color: #92400e; margin-bottom: 15px; font-size: 20px;">📍 Delivery Address</h3>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #fed7aa;">
                <div style="font-weight: 600; color: ${EMAIL_THEME.textPrimary}; margin-bottom: 10px;">${order.shippingAddress.name}</div>
                <div style="color: ${EMAIL_THEME.textSecondary}; line-height: 1.5;">
                    ${order.shippingAddress.line1}<br>
                    ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br>' : ''}
                    ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}<br>
                    ${order.shippingAddress.country}
                </div>
            </div>
        </div>

        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%); color: #1e40af; padding: 25px; border-radius: 12px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 20px;">📱 Track Your Package</h3>
            <div style="opacity: 0.95; line-height: 1.6;">
                <p style="margin: 0 0 10px 0;">You can track your package using the tracking number above on the carrier's website:</p>
                <div style="margin: 15px 0;">
                    ${order.shippoShipment?.carrier === 'USPS' ?
            `<a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.shippoShipment.trackingNumber}" style="color: #1d4ed8; font-weight: 600; text-decoration: none;">Track with USPS →</a>` :
            order.shippoShipment?.carrier === 'UPS' ?
                `<a href="https://www.ups.com/track?loc=en_US&tracknum=${order.shippoShipment.trackingNumber}" style="color: #1d4ed8; font-weight: 600; text-decoration: none;">Track with UPS →</a>` :
                order.shippoShipment?.carrier === 'FedEx' ?
                    `<a href="https://www.fedex.com/en-us/tracking.html?trknbr=${order.shippoShipment.trackingNumber}" style="color: #1d4ed8; font-weight: 600; text-decoration: none;">Track with FedEx →</a>` :
                    `<span style="color: #1d4ed8; font-weight: 600;">${order.shippoShipment?.carrier} Tracking: ${order.shippoShipment?.trackingNumber}</span>`
        }
                </div>
                <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.8;">💡 Tracking information may take a few hours to appear in the carrier's system</p>
            </div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <div style="background: linear-gradient(135deg, ${EMAIL_THEME.primaryColor} 0%, ${EMAIL_THEME.secondaryColor} 100%); color: white; padding: 25px; border-radius: 12px;">
                <h3 style="margin: 0 0 10px 0; color: white; font-size: 24px;">💜 Thank You for Your Order!</h3>
                <p style="margin: 0; opacity: 0.95; font-size: 16px;">We hope you love your handmade jewelry! Each piece was crafted with care and attention to detail just for you.</p>
            </div>
        </div>

        <div style="text-align: center; padding: 25px; background: ${EMAIL_THEME.lightBg}; border-radius: 8px; margin-top: 30px;">
            <p style="color: ${EMAIL_THEME.textSecondary}; margin: 0 0 15px 0; font-size: 16px;">Questions about your shipment?</p>
            <a href="mailto:info@butterfliesbeading.com" class="btn-primary" style="margin-right: 10px;">Email Support</a>
            <a href="tel:+15551234567" class="btn-primary" style="background: transparent; color: ${EMAIL_THEME.primaryColor}; border: 2px solid ${EMAIL_THEME.primaryColor};">Call Us</a>
        </div>
    `;

    console.log(`📧 Order Shipped Email Generated for ${order.customerEmail}`)
    console.log(`Subject: ${subject}`)
    console.log(`Tracking: ${order.shippoShipment?.trackingNumber}`)
    console.log(`Admin: ${adminUserId}`)

    return {
        to: order.customerEmail,
        subject,
        html: getBaseEmailTemplate('Order Shipped!', content, 'Your order is on its way with tracking information'),
        text: generateOrderShippedTextVersion(order)
    }
}

// Text versions for email clients that don't support HTML
function generateOrderAcceptedTextVersion(order: IOrder): string {
    return `Order ${order.orderNumber} Accepted - Thank You!

Dear Customer,

Your order has been accepted and is being prepared!

Order Details:
${order.items.map(item => `- ${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Order Summary:
Subtotal: $${order.subtotal.toFixed(2)}
Tax: $${order.tax.toFixed(2)}
Shipping: ${order.shippingCost ? '$' + order.shippingCost.toFixed(2) : 'TBD'}
Total: $${order.total.toFixed(2)}

What's Next?
✓ Your order has been accepted and is being prepared
📦 We will arrange shipping and contact you with tracking information
💳 Payment will be due when shipping is finalized
📧 We'll send you another email when your order ships

Thank you for choosing Butterflies Beading!`
}

function generatePaymentLinkTextVersion(order: IOrder, paymentLink: string): string {
    return `Payment Required for Order ${order.orderNumber}

Dear Customer,

Your order is ready for payment! Please use the secure link below to complete your payment:

${paymentLink}

Order Total: $${order.total.toFixed(2)}

This payment link expires in 24 hours for your security.

Thank you!`
}

function generateShippingUpdateTextVersion(order: IOrder, updateDetails: string): string {
    return `Shipping Update for Order ${order.orderNumber}

Dear Customer,

There's an update regarding the shipping for your order:

${updateDetails}

Order Number: ${order.orderNumber}
Order Date: ${new Date(order.createdAt).toLocaleDateString()}

Thank you!`
}

function generatePaymentSuccessTextVersion(order: IOrder, transactionId: string): string {
    return `Payment Successful - Order ${order.orderNumber} Confirmed!

Dear Customer,

Your payment has been successfully processed!

Transaction ID: ${transactionId}
Amount Paid: $${order.total.toFixed(2)}

Your order is now being processed and will be shipped soon.

Thank you for choosing Butterflies Beading!`
}

function generateTaxUpdateTextVersion(order: IOrder, oldTax: number, newTax: number, oldTotal: number, newTotal: number): string {
    return `Tax Adjustment for Order ${order.orderNumber}

Dear Customer,

There has been an adjustment to the sales tax for your order.

Old Tax: $${oldTax.toFixed(2)}
New Tax: $${newTax.toFixed(2)}
Old Total: $${oldTotal.toFixed(2)}
New Total: $${newTotal.toFixed(2)}

If a payment link was previously sent, it may be invalid. A new payment link will be provided if necessary.

Thank you!`
}

function generateOrderShippedTextVersion(order: IOrder): string {
    return `Your Order ${order.orderNumber} Has Shipped!

Dear Customer,

Great news! Your order has been shipped and is on its way to you.

Shipping Details:
${order.shippoShipment?.carrier ? `Carrier: ${order.shippoShipment.carrier}` : ''}
${order.shippoShipment?.serviceLevelName ? `Service: ${order.shippoShipment.serviceLevelName}` : ''}
${order.shippoShipment?.trackingNumber ? `Tracking Number: ${order.shippoShipment.trackingNumber}` : ''}
${order.shippoShipment?.estimatedDeliveryDays ? `Estimated Delivery: ${order.shippoShipment.estimatedDeliveryDays} business days` : ''}

Shipped Items:
${order.items.map(item => `- ${item.name} (Qty: ${item.quantity})`).join('\n')}

Delivery Address:
${order.shippingAddress.name}
${order.shippingAddress.line1}
${order.shippingAddress.line2 ? order.shippingAddress.line2 : ''}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}

You can track your package using the tracking number above on the carrier's website.

Thank you for choosing Butterflies Beading!`
}
