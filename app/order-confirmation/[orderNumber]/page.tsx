'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useUser } from '@clerk/nextjs'

interface OrderDetails {
    _id: string
    orderNumber: string
    items: Array<{
        name: string
        price: number
        salePrice?: number
        effectivePrice: number
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
    createdAt: string
    shippingAddress: {
        name: string
        line1: string
        line2?: string
        city: string
        state: string
        postal_code: string
    }
    shippingMethod: string
}

export default function OrderConfirmationPage() {
    const params = useParams()
    const { user } = useUser()
    const [order, setOrder] = useState<OrderDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await fetch(`/api/orders/by-number/${params.orderNumber}`)
                if (!response.ok) {
                    throw new Error('Order not found')
                }
                const data = await response.json()
                setOrder(data.order)
            } catch (error) {
                setError('Failed to load order details')
                console.error('Error fetching order:', error)
            } finally {
                setLoading(false)
            }
        }

        if (params.orderNumber) {
            fetchOrder()
        }
    }, [params.orderNumber])

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-lg text-gray-600">Loading order details...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Order Not Found</h1>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Link href="/" className="btn-primary">
                            Return Home
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            <Header />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Message */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Received!</h1>
                    <p className="text-lg text-gray-600">
                        Thank you for your order. We'll review it and contact you within 24 hours.
                    </p>
                </div>

                {/* Order Details */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Order #{order.orderNumber}</h2>
                                <p className="text-sm text-gray-600">
                                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="mt-2 sm:mt-0">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                    {order.status.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="px-6 py-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Items Ordered</h3>
                        <div className="space-y-4">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex items-center space-x-4">
                                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md"></div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                                        <div className="text-sm text-gray-500">
                                            {item.size && <span>Size: {item.size}</span>}
                                            {item.color && <span className="ml-2">Color: {item.color}</span>}
                                        </div>
                                        <div className="text-sm text-gray-900">
                                            Quantity: {item.quantity} × ${item.effectivePrice.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900">
                                        ${(item.effectivePrice * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="px-6 py-4 border-t border-gray-200">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="text-gray-900">${order.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping ({order.shippingMethod})</span>
                                <span className="text-gray-900">${order.shippingCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax</span>
                                <span className="text-gray-900">${order.tax.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2">
                                <div className="flex justify-between">
                                    <span className="text-base font-semibold text-gray-900">Total</span>
                                    <span className="text-lg font-bold text-gray-900">${order.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="px-6 py-4 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Shipping Address</h3>
                        <div className="text-sm text-gray-600">
                            <p>{order.shippingAddress.name}</p>
                            <p>{order.shippingAddress.line1}</p>
                            {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}</p>
                        </div>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">What's Next?</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Our team will review your order and current pricing</li>
                        <li>• We'll contact you within 24 hours with final details</li>
                        <li>• Payment will be processed after your confirmation</li>
                        <li>• You'll receive tracking information once shipped</li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="mt-8 text-center space-x-4">
                    <Link href="/products" className="btn-secondary">
                        Continue Shopping
                    </Link>
                    <Link href="/orders" className="btn-primary">
                        View All Orders
                    </Link>
                </div>
            </div>
        </div>
    )
}
