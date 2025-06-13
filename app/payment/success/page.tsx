'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useCart } from '@/lib/contexts/CartContext'

interface OrderDetails {
    _id: string
    orderNumber: string
    items: Array<{
        name: string
        price: number
        quantity: number
        size?: string
        color?: string
        image?: string
    }>
    subtotal: number
    shippingCost: number
    tax: number
    total: number
    status: string
    paymentStatus: string
    createdAt: string
    transactionId?: string
    shippoShipment?: {
        trackingNumber?: string
        estimatedDeliveryDays?: number
    }
    shippingAddress: {
        name: string
        line1: string
        line2?: string
        city: string
        state: string
        postal_code: string
        country: string
    }
}

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams()
    const { clearCart } = useCart()
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [retryCount, setRetryCount] = useState(0)

    const sessionId = searchParams.get('session_id')
    const orderId = searchParams.get('order_id')
    const paymentIntentId = searchParams.get('payment_intent')

    useEffect(() => {
        const verifyPaymentAndFetchOrder = async () => {
            if (!sessionId || !orderId) {
                setError('Missing payment information')
                setLoading(false)
                return
            }

            try {
                console.log('Verifying payment with:', { sessionId, orderId, paymentIntentId })

                // Verify payment and get order details
                const response = await fetch('/api/payment/verify-success', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId,
                        orderId,
                        paymentIntentId
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    // If unauthorized and we haven't retried much, try again after a short delay
                    if (response.status === 403 && retryCount < 3) {
                        console.log(`Retrying verification (attempt ${retryCount + 1})...`)
                        setRetryCount(prev => prev + 1)
                        setTimeout(() => {
                            verifyPaymentAndFetchOrder()
                        }, 1000 * (retryCount + 1)) // Exponential backoff
                        return
                    }
                    throw new Error(data.error || `HTTP ${response.status}: Failed to verify payment`)
                }

                if (data.success) {
                    setOrderDetails(data.order)
                    clearCart() // Clear cart after successful payment
                } else {
                    throw new Error('Payment verification failed')
                }
            } catch (error) {
                console.error('Error verifying payment:', error)
                setError(error instanceof Error ? error.message : 'Payment verification failed')
            } finally {
                setLoading(false)
            }
        }

        verifyPaymentAndFetchOrder()
    }, [sessionId, orderId, paymentIntentId, clearCart, retryCount])

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                        <p className="mt-4 text-lg text-gray-600">
                            Verifying your payment...
                            {retryCount > 0 && <span className="block text-sm text-gray-500 mt-2">Retry attempt {retryCount}</span>}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Payment Verification Failed</h3>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-primary mr-4"
                            >
                                Try Again
                            </button>
                            <Link href="/cart" className="btn-secondary">
                                Return to Cart
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
            <Header />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">🎉 Payment Successful!</h1>
                    <p className="text-lg text-gray-600">
                        Thank you for your purchase! Your order has been confirmed.
                    </p>
                </div>

                {orderDetails && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {/* Order Header */}
                        <div className="bg-gradient-to-r from-green-500 to-blue-600 px-6 py-4">
                            <div className="flex justify-between items-center text-white">
                                <div>
                                    <h2 className="text-xl font-semibold">Order #{orderDetails.orderNumber}</h2>
                                    <p className="text-green-100">
                                        Placed on {new Date(orderDetails.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">${orderDetails.total.toFixed(2)}</p>
                                    <p className="text-green-100">Total Paid</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Transaction Info */}
                            {orderDetails.transactionId && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                    <h3 className="font-semibold text-green-800 mb-2">Payment Confirmation</h3>
                                    <p className="text-sm text-green-700">
                                        <strong>Transaction ID:</strong> {orderDetails.transactionId}
                                    </p>
                                    <p className="text-sm text-green-700">
                                        <strong>Payment Status:</strong> <span className="capitalize">{orderDetails.paymentStatus}</span>
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Order Items */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                                    <div className="space-y-4">
                                        {orderDetails.items.map((item, index) => (
                                            <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                                {item.image && (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                )}
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                                                    <div className="text-sm text-gray-600">
                                                        {item.size && <span>Size: {item.size} </span>}
                                                        {item.color && <span>Color: {item.color} </span>}
                                                        <span>Qty: {item.quantity}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-gray-900">
                                                        ${(item.price * item.quantity).toFixed(2)}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        ${item.price.toFixed(2)} each
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order Total */}
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Subtotal:</span>
                                                <span>${orderDetails.subtotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>Shipping:</span>
                                                <span>
                                                    {orderDetails.shippingCost === 0 ? (
                                                        <span className="text-green-600 font-medium">FREE</span>
                                                    ) : (
                                                        `$${orderDetails.shippingCost.toFixed(2)}`
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>Tax:</span>
                                                <span>${orderDetails.tax.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                                <span>Total Paid:</span>
                                                <span className="text-green-600">${orderDetails.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping Info */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Information</h3>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <div className="text-sm text-gray-600">
                                            <div className="font-medium text-gray-900">{orderDetails.shippingAddress.name}</div>
                                            <div>{orderDetails.shippingAddress.line1}</div>
                                            {orderDetails.shippingAddress.line2 && <div>{orderDetails.shippingAddress.line2}</div>}
                                            <div>
                                                {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.state} {orderDetails.shippingAddress.postal_code}
                                            </div>
                                            <div>{orderDetails.shippingAddress.country}</div>
                                        </div>
                                    </div>

                                    {orderDetails.shippoShipment?.trackingNumber && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                            <h4 className="font-semibold text-green-800 mb-2">Tracking Information</h4>
                                            <p className="text-sm text-green-700">
                                                <strong>Tracking Number:</strong> {orderDetails.shippoShipment.trackingNumber}
                                            </p>
                                            {orderDetails.shippoShipment.estimatedDeliveryDays && (
                                                <p className="text-sm text-green-700">
                                                    <strong>Estimated Delivery:</strong> {orderDetails.shippoShipment.estimatedDeliveryDays} business days
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* What's Next */}
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-800 mb-3">What's Next?</h4>
                                        <div className="space-y-2 text-sm text-blue-700">
                                            <div className="flex items-center">
                                                <span className="text-green-600 mr-2">✅</span>
                                                <span>Payment confirmed and processed</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-blue-600 mr-2">📦</span>
                                                <span>Your order is being prepared for shipment</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-purple-600 mr-2">🚚</span>
                                                <span>You'll receive tracking information once shipped</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-orange-600 mr-2">📧</span>
                                                <span>Check your email for order confirmation and updates</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/products" className="btn-primary text-center">
                        Continue Shopping
                    </Link>
                    <Link href="/orders" className="btn-secondary text-center">
                        View Order History
                    </Link>
                </div>

                {/* Email Confirmation Notice */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        📧 A confirmation email with your order details and receipt has been sent to your email address.
                    </p>
                </div>
            </div>
        </div>
    )
}
