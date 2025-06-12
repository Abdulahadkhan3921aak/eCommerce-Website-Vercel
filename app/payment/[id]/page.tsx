'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { usePopup } from '@/lib/contexts/PopupContext'

interface OrderItem {
    productId: string
    name: string
    price: number
    quantity: number
    size?: string
    color?: string
    image?: string
}

interface OrderData {
    _id: string
    orderNumber: string
    customerEmail: string
    items: OrderItem[]
    subtotal: number
    tax: number
    shippingCost: number
    total: number
    status: string
    paymentStatus: string
    shippingAddress: {
        name: string
        line1: string
        line2?: string
        city: string
        state: string
        postal_code: string
        country: string
    }
    shippoShipment?: {
        carrier?: string
        serviceLevelName?: string
        estimatedDeliveryDays?: number
        trackingNumber?: string
    }
    expiresAt?: string
}

export default function PaymentPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = params.id as string
    const token = searchParams.get('token')

    const [order, setOrder] = useState<OrderData | null>(null)
    const [loading, setLoading] = useState(true)
    const [verifying, setVerifying] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processingPayment, setProcessingPayment] = useState(false)

    const { showAlert } = usePopup()

    useEffect(() => {
        if (orderId && token) {
            verifyTokenAndFetchOrder()
        } else {
            setError('Invalid payment link - missing required parameters')
            setLoading(false)
            setVerifying(false)
        }
    }, [orderId, token])

    const verifyTokenAndFetchOrder = async () => {
        try {
            const response = await fetch(`/api/orders/${orderId}/verify?token=${token}`)
            const data = await response.json()

            if (response.ok) {
                setOrder(data.order)
                setError(null)
            } else {
                setError(data.error || 'Invalid or expired payment link')
            }
        } catch (error) {
            console.error('Error verifying token:', error)
            setError('Failed to verify payment link')
        } finally {
            setLoading(false)
            setVerifying(false)
        }
    }

    const handlePayNow = async () => {
        if (!order) return

        setProcessingPayment(true)
        try {
            const response = await fetch(`/api/orders/${orderId}/create-stripe-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    successUrl: `${window.location.origin}/payment/success?orderId=${orderId}`,
                    cancelUrl: `${window.location.origin}/payment/[id]?token=${token}`
                })
            })

            const data = await response.json()

            if (response.ok && data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url
            } else {
                showAlert(data.error || 'Failed to create payment session', 'error')
                setProcessingPayment(false)
            }
        } catch (error) {
            console.error('Error creating payment session:', error)
            showAlert('Failed to process payment request', 'error')
            setProcessingPayment(false)
        }
    }

    const isPaymentExpired = () => {
        if (!order?.expiresAt) return false
        return new Date() > new Date(order.expiresAt)
    }

    const getTimeUntilExpiry = () => {
        if (!order?.expiresAt) return null
        const now = new Date()
        const expiry = new Date(order.expiresAt)
        const diff = expiry.getTime() - now.getTime()

        if (diff <= 0) return null

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (days > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`
        return `${minutes} minute${minutes > 1 ? 's' : ''}`
    }

    if (verifying) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-2xl mx-auto px-4 py-16">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-lg text-gray-600">Verifying payment link...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-2xl mx-auto px-4 py-16">
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Link Invalid</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="btn-primary"
                        >
                            Return to Store
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-2xl mx-auto px-4 py-16">
                    <div className="text-center">
                        <p className="text-lg text-gray-600">Order not found</p>
                    </div>
                </div>
            </div>
        )
    }

    const expired = isPaymentExpired()
    const timeLeft = getTimeUntilExpiry()

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Payment Status Alert */}
                {expired ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Payment Link Expired</h3>
                                <p className="mt-1 text-sm text-red-700">
                                    This payment link has expired. Please contact us for a new payment link.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : timeLeft && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-medium text-yellow-800">Payment Link Expires Soon</h3>
                                <p className="mt-1 text-sm text-yellow-700">
                                    This payment link expires in {timeLeft}. Please complete your payment soon.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Order Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Complete Your Payment</h1>
                        <p className="text-gray-600 mt-2">Order #{order.orderNumber}</p>
                    </div>

                    {/* Customer & Shipping Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Customer Email</h3>
                            <p className="text-sm text-gray-600">{order.customerEmail}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Shipping Address</h3>
                            <div className="text-sm text-gray-600">
                                <div>{order.shippingAddress.name}</div>
                                <div>{order.shippingAddress.line1}</div>
                                {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                                <div>
                                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Info */}
                    {order.shippoShipment && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Shipping Information</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                {order.shippoShipment.carrier && (
                                    <div><strong>Carrier:</strong> {order.shippoShipment.carrier}</div>
                                )}
                                {order.shippoShipment.serviceLevelName && (
                                    <div><strong>Service:</strong> {order.shippoShipment.serviceLevelName}</div>
                                )}
                                {order.shippoShipment.estimatedDeliveryDays && (
                                    <div><strong>Estimated Delivery:</strong> {order.shippoShipment.estimatedDeliveryDays} business days</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                        <div className="space-y-4">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        {item.image && (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-16 h-16 object-cover rounded-lg"
                                            />
                                        )}
                                        <div>
                                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                                            <div className="text-sm text-gray-600">
                                                {item.size && <span>Size: {item.size} </span>}
                                                {item.color && <span>Color: {item.color} </span>}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                ${item.price.toFixed(2)} × {item.quantity}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-gray-900">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Total */}
                    <div className="border-t pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="text-gray-900">${order.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping:</span>
                                <span className="text-gray-900">
                                    {order.shippingCost === 0 ? (
                                        <span className="text-green-600 font-medium">FREE</span>
                                    ) : (
                                        `$${order.shippingCost.toFixed(2)}`
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax:</span>
                                <span className="text-gray-900">${order.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                                <span>Total:</span>
                                <span>${order.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Button */}
                    <div className="mt-8">
                        {expired ? (
                            <div className="text-center">
                                <p className="text-red-600 mb-4">This payment link has expired</p>
                                <button
                                    onClick={() => router.push('/')}
                                    className="btn-secondary"
                                >
                                    Return to Store
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handlePayNow}
                                disabled={processingPayment}
                                className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {processingPayment ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                        Processing...
                                    </div>
                                ) : (
                                    `Pay Now - $${order.total.toFixed(2)}`
                                )}
                            </button>
                        )}
                    </div>

                    {/* Security Note */}
                    <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Secure payment powered by Stripe</span>
                    </div>
                </div>

                {/* Help Section */}
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
                    <p className="text-gray-600 text-sm mb-4">
                        If you have any questions about your order or payment, please contact our support team.
                    </p>
                    <div className="flex justify-center space-x-4 text-sm">
                        <a href="mailto:support@yourstore.com" className="text-purple-600 hover:text-purple-800">
                            Email Support
                        </a>
                        <span className="text-gray-300">|</span>
                        <a href="tel:+1234567890" className="text-purple-600 hover:text-purple-800">
                            Call Support
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
