import nodemailer from 'nodemailer'

interface OrderItem {
    name: string
    quantity: number
    price: number
    size?: string
    color?: string
}

interface ShippingInfo {
    cost: number
    estimatedDays?: number
    serviceName?: string
    carrier?: string
}

interface PaymentLinkEmailData {
    orderNumber: string
    customerName: string
    customerEmail: string
    items: OrderItem[]
    subtotal: number
    shippingInfo?: ShippingInfo
    tax: number
    total: number
    paymentLink: string
    expiryDate: Date
}

class EmailService {
    private transporter: nodemailer.Transporter

    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        })
    }

    private generatePaymentLinkEmailHTML(data: PaymentLinkEmailData): string {
        const itemsHTML = data.items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <div style="font-weight: 600; color: #1f2937;">${item.name}</div>
                    ${item.size ? `<div style="font-size: 14px; color: #6b7280;">Size: ${item.size}</div>` : ''}
                    ${item.color ? `<div style="font-size: 14px; color: #6b7280;">Color: ${item.color}</div>` : ''}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    ${item.quantity}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    $${item.price.toFixed(2)}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
                    $${(item.price * item.quantity).toFixed(2)}
                </td>
            </tr>
        `).join('')

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Complete Your Payment - Order ${data.orderNumber}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Complete Your Payment</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Order ${data.orderNumber}</p>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Hello ${data.customerName},
                </p>
                
                <p style="font-size: 16px; margin-bottom: 30px;">
                    Your order has been processed and is ready for payment. Please complete your payment using the secure link below.
                </p>

                <!-- Order Summary -->
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">Order Summary</h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Item</th>
                                <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Qty</th>
                                <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Unit Price</th>
                                <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHTML}
                        </tbody>
                    </table>
                </div>

                <!-- Pricing Breakdown -->
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="padding: 8px 0; font-size: 16px;">Subtotal:</td>
                            <td style="padding: 8px 0; text-align: right; font-size: 16px;">$${data.subtotal.toFixed(2)}</td>
                        </tr>
                        ${data.shippingInfo ? `
                        <tr>
                            <td style="padding: 8px 0; font-size: 16px;">
                                Shipping${data.shippingInfo.serviceName ? ` (${data.shippingInfo.serviceName})` : ''}:
                                ${data.shippingInfo.estimatedDays ? `<br><small style="color: #6b7280;">Estimated ${data.shippingInfo.estimatedDays} business days</small>` : ''}
                            </td>
                            <td style="padding: 8px 0; text-align: right; font-size: 16px;">
                                ${data.shippingInfo.cost === 0 ? '<span style="color: #059669; font-weight: 600;">FREE</span>' : `$${data.shippingInfo.cost.toFixed(2)}`}
                            </td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 8px 0; font-size: 16px;">Tax:</td>
                            <td style="padding: 8px 0; text-align: right; font-size: 16px;">$${data.tax.toFixed(2)}</td>
                        </tr>
                        <tr style="border-top: 2px solid #e5e7eb;">
                            <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #1f2937;">Total:</td>
                            <td style="padding: 12px 0; text-align: right; font-size: 20px; font-weight: 700; color: #1f2937;">$${data.total.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Payment Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${data.paymentLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                        Complete Payment - $${data.total.toFixed(2)}
                    </a>
                </div>

                <!-- Security Notice -->
                <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 16px; border-radius: 8px; margin: 30px 0;">
                    <div style="display: flex; align-items: center;">
                        <span style="color: #059669; margin-right: 8px; font-size: 18px;">🔒</span>
                        <div>
                            <strong style="color: #065f46;">Secure Payment</strong>
                            <p style="margin: 4px 0 0 0; color: #047857; font-size: 14px;">
                                Your payment is processed securely through Stripe. We never store your payment information.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Expiry Notice -->
                <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <strong style="color: #92400e;">⏰ Payment Link Expires:</strong>
                    <p style="margin: 4px 0 0 0; color: #b45309; font-size: 14px;">
                        ${data.expiryDate.toLocaleDateString()} at ${data.expiryDate.toLocaleTimeString()}
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    If you have any questions about your order, please contact our support team.
                </p>
                
                <p style="font-size: 14px; color: #6b7280;">
                    Thank you for your business!<br>
                    <strong>Butterflies Beading Team</strong>
                </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                    This is an automated email. Please do not reply to this email address.
                </p>
            </div>
        </body>
        </html>
        `
    }

    async sendPaymentLinkEmail(data: PaymentLinkEmailData): Promise<boolean> {
        try {
            const htmlContent = this.generatePaymentLinkEmailHTML(data)

            await this.transporter.sendMail({
                from: `"${process.env.FROM_NAME || 'Butterflies Beading'}" <${process.env.FROM_EMAIL}>`,
                to: data.customerEmail,
                subject: `Complete Your Payment - Order ${data.orderNumber}`,
                html: htmlContent,
                text: `
Hello ${data.customerName},

Your order ${data.orderNumber} is ready for payment.

Order Total: $${data.total.toFixed(2)}

Complete your payment here: ${data.paymentLink}

This payment link expires on ${data.expiryDate.toLocaleDateString()}.

Thank you for your business!
Butterflies Beading Team
                `.trim()
            })

            return true
        } catch (error) {
            console.error('Failed to send payment link email:', error)
            return false
        }
    }
}

export default new EmailService()
