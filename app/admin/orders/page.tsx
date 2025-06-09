'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'

interface Order {
    _id: string
    orderNumber: string
    customerEmail: string
    total: number
    status: string // e.g., pending_approval, approved, rejected, processing, shipped, pending_payment_adjustment
    paymentStatus: string
    paymentMethod?: string // e.g., 'stripe_card', 'stripe_apple_pay'
    stripePaymentIntentId?: string
    createdAt: string
    items: Array<{
        name: string
        quantity: number
        price: number
    }>
    shippingAddress: {
        name: string
        line1: string
        city: string
        state: string // Assuming US states
        postalCode: string // Added for completeness for US shipping
        country: 'US' // Explicitly US
    }
    adminApproval?: {
        isApproved: boolean
        rejectionReason?: string
        adminNotes?: string
    }
    shippoShipment?: {
        rateId?: string;
        carrier?: string;
        serviceLevelToken?: string;
        serviceLevelName?: string;
        cost?: number;
        estimatedDeliveryDays?: number;
        trackingNumber?: string;
        labelUrl?: string;
        transactionId?: string;
    }
    shippingWeight?: number // in a consistent unit, e.g., kg or lbs
    shippingDimensions?: { // in a consistent unit, e.g., cm or inches
        length: number
        width: number
        height: number
    }
    isPriceAdjusted?: boolean
    originalOrderId?: string // If this order is an adjustment of a previous one
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [showEmailModal, setShowEmailModal] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailContent, setEmailContent] = useState('')

    // State for shipping details modal
    const [showShippingModal, setShowShippingModal] = useState(false)
    const [selectedOrderForShipping, setSelectedOrderForShipping] = useState<Order | null>(null)
    const [shippingWeightInput, setShippingWeightInput] = useState('')
    const [shippingLengthInput, setShippingLengthInput] = useState('')
    const [shippingWidthInput, setShippingWidthInput] = useState('')
    const [shippingHeightInput, setShippingHeightInput] = useState('')


    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/admin/orders')
            const data = await response.json()
            setOrders(data.orders)
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApproveOrder = async (orderId: string, adminNotes?: string) => {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminNotes })
            })

            if (response.ok) {
                alert('Order approved successfully!')
                fetchOrders()
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error approving order:', error)
            alert('Failed to approve order')
        }
    }

    const handleRejectOrder = async (orderId: string, rejectionReason: string) => {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason })
            })

            if (response.ok) {
                alert('Order rejected successfully!')
                fetchOrders()
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error rejecting order:', error)
            alert('Failed to reject order')
        }
    }

    const handleSendEmail = async () => {
        if (!selectedOrder || !emailSubject || !emailContent) {
            alert('Please fill in all fields')
            return
        }

        try {
            const response = await fetch(`/api/admin/orders/${selectedOrder._id}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: emailSubject,
                    content: emailContent
                })
            })

            if (response.ok) {
                alert('Email sent successfully!')
                setShowEmailModal(false)
                setEmailSubject('')
                setEmailContent('')
                setSelectedOrder(null)
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error sending email:', error)
            alert('Failed to send email')
        }
    }

    const handleOpenShippingModal = (order: Order) => {
        setSelectedOrderForShipping(order)
        setShippingWeightInput(order.shippingWeight?.toString() || '')
        setShippingDimensionsInput(order.shippingDimensions)
        setShowShippingModal(true)
    }

    const setShippingDimensionsInput = (dimensions: Order['shippingDimensions']) => {
        if (dimensions) {
            setShippingLengthInput(dimensions.length.toString())
            setShippingWidthInput(dimensions.width.toString())
            setShippingHeightInput(dimensions.height.toString())
        } else {
            setShippingLengthInput('')
            setShippingWidthInput('')
            setShippingHeightInput('')
        }
    }

    const handleUpdateShippingDetails = async () => {
        if (!selectedOrderForShipping) return

        const weight = parseFloat(shippingWeightInput)
        const length = parseFloat(shippingLengthInput)
        const width = parseFloat(shippingWidthInput)
        const height = parseFloat(shippingHeightInput)

        if (isNaN(weight) || isNaN(length) || isNaN(width) || isNaN(height) || weight <= 0 || length <= 0 || width <= 0 || height <= 0) {
            alert('Please enter valid positive numbers for all shipping details.')
            return
        }

        try {
            const response = await fetch(`/api/admin/orders/${selectedOrderForShipping._id}/update-shipping-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shippingWeight: weight,
                    shippingDimensions: { length, width, height }
                })
            })

            if (response.ok) {
                alert('Shipping details updated. If price changed, user will be notified.')
                fetchOrders() // Refresh orders
                setShowShippingModal(false)
                setSelectedOrderForShipping(null)
            } else {
                const error = await response.json()
                alert(`Error updating shipping details: ${error.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error updating shipping details:', error)
            alert('Failed to update shipping details.')
        }
    }


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_approval': return 'bg-yellow-100 text-yellow-800'
            case 'approved': return 'bg-green-100 text-green-800'
            case 'rejected': return 'bg-red-100 text-red-800'
            case 'processing': return 'bg-blue-100 text-blue-800'
            case 'shipped': return 'bg-purple-100 text-purple-800'
            case 'pending_payment_adjustment': return 'bg-orange-100 text-orange-800' // New status
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-lg text-gray-600">Loading orders...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                    <Link href="/admin" className="btn-secondary">
                        Back to Dashboard
                    </Link>
                </div>

                <div className="bg-white shadow overflow-hidden rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Order
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {orders.map((order) => (
                                <tr key={order._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {order.orderNumber}
                                                {order.isPriceAdjusted && (
                                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-100 text-pink-800">
                                                        Price Adjusted
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {order.items.length} items
                                                {order.originalOrderId && (
                                                    <Link href={`/admin/orders/${order.originalOrderId}`} className="ml-2 text-xs text-blue-500 hover:underline">
                                                        (Original: {order.originalOrderId.slice(-6)})
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {order.shippingAddress.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {order.customerEmail}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${order.total.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                        {order.status === 'pending_approval' && order.adminApproval?.rejectionReason && (
                                            <div className="text-xs text-red-500 mt-1">Reason: {order.adminApproval.rejectionReason}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>
                                            <div className="text-sm text-gray-900">{order.paymentStatus}</div>
                                            <div className="text-xs text-gray-500">{order.paymentMethod?.replace('_', ' ')}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {order.status === 'pending_approval' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const notes = prompt('Admin notes (optional):')
                                                        handleApproveOrder(order._id, notes || undefined)
                                                    }}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt('Rejection reason:')
                                                        if (reason) handleRejectOrder(order._id, reason)
                                                    }}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {order.status !== 'shipped' && order.status !== 'rejected' && (
                                            <button
                                                onClick={() => handleOpenShippingModal(order)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Update Shipping
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedOrder(order)
                                                setShowEmailModal(true)
                                            }}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Email
                                        </button>
                                        <Link
                                            href={`/admin/orders/${order._id}`}
                                            className="text-purple-600 hover:text-purple-900"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Email Modal */}
                {showEmailModal && selectedOrder && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Send Email to {selectedOrder.shippingAddress.name}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Email subject..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Message
                                    </label>
                                    <textarea
                                        value={emailContent}
                                        onChange={(e) => setEmailContent(e.target.value)}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Your message..."
                                    />
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowEmailModal(false)
                                            setEmailSubject('')
                                            setEmailContent('')
                                            setSelectedOrder(null)
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendEmail}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
                                    >
                                        Send Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shipping Details Modal */}
                {showShippingModal && selectedOrderForShipping && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Update Shipping Details for Order {selectedOrderForShipping.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-600 mb-1">Current Total: ${selectedOrderForShipping.total.toFixed(2)}</p>
                            {selectedOrderForShipping.shippoShipment?.cost && (
                                <p className="text-sm text-gray-600 mb-4">Current Shipping Cost: ${selectedOrderForShipping.shippoShipment.cost.toFixed(2)}</p>
                            )}


                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Shipping Weight (e.g., in kg or lbs - ensure consistency)
                                    </label>
                                    <input
                                        type="number"
                                        value={shippingWeightInput}
                                        onChange={(e) => setShippingWeightInput(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Weight"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Length (cm/in)
                                        </label>
                                        <input
                                            type="number"
                                            value={shippingLengthInput}
                                            onChange={(e) => setShippingLengthInput(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="L"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Width (cm/in)
                                        </label>
                                        <input
                                            type="number"
                                            value={shippingWidthInput}
                                            onChange={(e) => setShippingWidthInput(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="W"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Height (cm/in)
                                        </label>
                                        <input
                                            type="number"
                                            value={shippingHeightInput}
                                            onChange={(e) => setShippingHeightInput(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="H"
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowShippingModal(false)
                                            setSelectedOrderForShipping(null)
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateShippingDetails}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
                                    >
                                        Update and Recalculate
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Updating these details may change the shipping cost. If the total price changes, the customer will be notified to complete a new payment for the adjusted amount. The original order might be marked or a new related order created.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
