'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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

interface OrderDetails {
    _id: string
    orderNumber: string
    items: OrderItem[]
    subtotal: number
    shippingCost: number
    tax: number
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
        serviceLevelName?: string
        estimatedDeliveryDays?: number
    }
    customerEmail: string
    createdAt: string
}

export default function PaymentPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const orderId = params.id as string
    const token = searchParams.get('token')
    const cancelled = searchParams.get('cancelled')

    const [order, setOrder] = useState<OrderDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { showAlert } = usePopup()

    useEffect(() => {
        if (cancelled) {
            showAlert('Payment was cancelled. You can try again when ready.', 'warning')
        }
    }, [cancelled, showAlert])

    useEffect(() => {
        if (orderId && token) {
            fetchOrderDetails()
        } else {
            setError('Invalid payment link')
            setLoading(false)
        }
    }, [orderId, token])

    const fetchOrderDetails = async () => {
        try {
            const response = await fetch(`/api/orders/${orderId}/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setOrder(data.order)
            } else {
                const errorData = await response.json()
                setError(errorData.error || 'Failed to load order details')
            }
        } catch (error) {
            console.error('Error fetching order:', error)
            setError('Failed to load order details')
        } finally {
            setLoading(false)
        }
    }

    const handlePayNow = async () => {
        if (!order || !token) return

        setProcessing(true)
        try {
            const response = await fetch(`/api/orders/${orderId}/create-stripe-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            })

            if (response.ok) {
                const data = await response.json()
                // Redirect to Stripe Checkout
                window.location.href = data.sessionUrl
            } else {
                const errorData = await response.json()
                showAlert(errorData.error || 'Failed to create payment session', 'error')
            }
        } catch (error) {
            console.error('Error creating payment session:', error)
            showAlert('Failed to process payment', 'error')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-lg text-gray-600">Loading order details...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <div className="text-red-600 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Link Invalid</h1>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <p className="text-sm text-gray-500">
                            Please contact us if you believe this is an error or if you need a new payment link.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!order) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Complete Your Payment</h1>
                    <p className="mt-2 text-lg text-gray-600">Order #{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Order Details */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

                        {/* Items */}
                        <div className="space-y-4 mb-6">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                                        <div className="text-sm text-gray-600">
                                            {item.size && <span>Size: {item.size} </span>}
                                            {item.color && <span>Color: {item.color} </span>}
                                            <span>Qty: {item.quantity}</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            ${item.price.toFixed(2)} each
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Total */}
                        <div className="border-t border-gray-200 pt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>${order.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>
                                        Shipping
                                        {order.shippoShipment?.serviceLevelName && (
                                            <span className="text-gray-500"> ({order.shippoShipment.serviceLevelName})</span>
                                        )}:
                                    </span>
                                    <span>
                                        {order.shippingCost === 0 ? (
                                            <span className="text-green-600 font-medium">FREE</span>
                                        ) : (
                                            `$${order.shippingCost.toFixed(2)}`
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Tax:</span>
                                    <span>${order.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                                    <span>Total:</span>
                                    <span>${order.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment & Shipping Info */}
                    <div className="space-y-6">
                        {/* Payment Section */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment</h2>
                            <p className="text-gray-600 mb-6">
                                Click the button below to complete your secure payment via Stripe.
                            </p>

                            <button
                                onClick={handlePayNow}
                                disabled={processing}
                                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Processing...
                                    </div>
                                ) : (
                                    <>
                                        Pay ${order.total.toFixed(2)} Now
                                        <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Secured by Stripe
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>
                            <div className="text-sm text-gray-600">
                                <div className="font-medium text-gray-900">{order.shippingAddress.name}</div>
                                <div>{order.shippingAddress.line1}</div>
                                {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                                <div>
                                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}
                                </div>
                                <div>{order.shippingAddress.country}</div>
                            </div>

                            {order.shippoShipment?.estimatedDeliveryDays && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <div className="text-sm text-blue-800">
                                        <strong>Estimated Delivery:</strong> {order.shippoShipment.estimatedDeliveryDays} business day{order.shippoShipment.estimatedDeliveryDays !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Security Notice */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h3 className="text-sm font-medium text-green-800">Secure Payment</h3>
                                    <p className="mt-1 text-sm text-green-700">
                                        Your payment information is processed securely through Stripe and is never stored on our servers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
