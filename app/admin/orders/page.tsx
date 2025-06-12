'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePopup } from '@/lib/contexts/PopupContext'

interface Order {
    _id: string
    orderNumber: string
    customerEmail: string
    total: number
    subtotal?: number
    shippingCost?: number
    tax?: number
    status: string // e.g., pending_approval, approved, rejected, processing, shipped, pending_payment_adjustment
    paymentStatus: string
    paymentMethod?: string // e.g., 'stripe_card', 'stripe_apple_pay'
    stripePaymentIntentId?: string
    createdAt: string
    items: Array<{
        name: string
        quantity: number
        price: number
        productId?: string
    }>
    shippingAddress: {
        name: string
        line1: string
        line2?: string
        city: string
        state: string // Assuming US states
        postal_code: string
        country: 'US' // Explicitly US
        residential?: boolean
    }
    adminApproval?: {
        isApproved: boolean
        rejectionReason?: string
        adminNotes?: string
        approvedBy?: string
        rejectedBy?: string
        approvedAt?: string
        rejectedAt?: string
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
    emailHistory?: Array<{
        sentBy: string
        type: string
        subject: string
        content: string
        sentAt: string
    }>
}

interface ShippingRate {
    rateId: string;
    carrier: string;
    serviceName: string;
    serviceLevelToken: string;
    serviceLevelName: string;
    cost: number;
    currency: string;
    estimatedDays?: number;
    deliveryEstimate: string;
    attributes: string[];
    providerImage?: string;
    arrivesBy?: string;
    durationTerms?: string;
    messages: any[];
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [showEmailModal, setShowEmailModal] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailContent, setEmailContent] = useState('')
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

    // State for shipping details modal
    const [showShippingModal, setShowShippingModal] = useState(false)
    const [selectedOrderForShipping, setSelectedOrderForShipping] = useState<Order | null>(null)
    const [shippingWeightInput, setShippingWeightInput] = useState('')
    const [shippingLengthInput, setShippingLengthInput] = useState('')
    const [shippingWidthInput, setShippingWidthInput] = useState('')
    const [shippingHeightInput, setShippingHeightInput] = useState('')

    // Add unit selection states
    const [selectedWeightUnit, setSelectedWeightUnit] = useState<'lb' | 'kg'>('lb')
    const [selectedDimensionUnit, setSelectedDimensionUnit] = useState<'in' | 'cm'>('in')

    // Additional state for shipping rate selection
    const [availableRates, setAvailableRates] = useState<ShippingRate[]>([])
    const [selectedRateId, setSelectedRateId] = useState<string>('')
    const [loadingRates, setLoadingRates] = useState(false)
    const [applyingRate, setApplyingRate] = useState(false)

    const { showAlert, showConfirm, showPopup } = usePopup()

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
                showAlert('Order approved successfully!', 'success')
                fetchOrders()
            } else {
                const error = await response.json()
                showAlert(`Error: ${error.error}`, 'error')
            }
        } catch (error) {
            console.error('Error approving order:', error)
            showAlert('Failed to approve order', 'error')
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
                showAlert('Order rejected successfully!', 'success')
                fetchOrders()
            } else {
                const error = await response.json()
                showAlert(`Error: ${error.error}`, 'error')
            }
        } catch (error) {
            console.error('Error rejecting order:', error)
            showAlert('Failed to reject order', 'error')
        }
    }

    // Replace prompt() calls with custom popups
    const handleApproveClick = (orderId: string) => {
        showPopup({
            title: 'Approve Order',
            message: 'Add any admin notes for this approval (optional):',
            type: 'confirm',
            component: (
                <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Admin notes..."
                    id="admin-notes"
                />
            ),
            actions: [
                {
                    label: 'Cancel',
                    action: () => { },
                    variant: 'secondary'
                },
                {
                    label: 'Approve',
                    action: () => {
                        const notes = (document.getElementById('admin-notes') as HTMLTextAreaElement)?.value
                        handleApproveOrder(orderId, notes || undefined)
                    },
                    variant: 'primary'
                }
            ]
        })
    }

    const handleRejectClick = (orderId: string) => {
        showPopup({
            title: 'Reject Order',
            message: 'Please provide a reason for rejecting this order:',
            type: 'confirm',
            component: (
                <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Rejection reason..."
                    id="rejection-reason"
                    required
                />
            ),
            actions: [
                {
                    label: 'Cancel',
                    action: () => { },
                    variant: 'secondary'
                },
                {
                    label: 'Reject Order',
                    action: () => {
                        const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement)?.value
                        if (reason) handleRejectOrder(orderId, reason)
                    },
                    variant: 'danger'
                }
            ]
        })
    }

    const handleSendEmail = async () => {
        if (!selectedOrder || !emailSubject || !emailContent) {
            showAlert('Please fill in all fields', 'warning')
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
                showAlert('Email sent successfully!', 'success')
                setShowEmailModal(false)
                setEmailSubject('')
                setEmailContent('')
                setSelectedOrder(null)
            } else {
                const error = await response.json()
                showAlert(`Error: ${error.error}`, 'error')
            }
        } catch (error) {
            console.error('Error sending email:', error)
            showAlert('Failed to send email', 'error')
        }
    }

    const handleOpenShippingModal = (order: Order) => {
        setSelectedOrderForShipping(order)
        setShippingWeightInput(order.shippingWeight?.toString() || '')
        setShippingDimensionsInput(order.shippingDimensions)

        // Set units from existing order or default to US imperial
        setSelectedWeightUnit(order.shippingWeightUnit || 'lb')
        setSelectedDimensionUnit(order.shippingDimensions?.unit || 'in')

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
            showAlert('Please enter valid positive numbers for all shipping details.', 'warning')
            return
        }

        setLoadingRates(true)
        try {
            const response = await fetch(`/api/admin/orders/${selectedOrderForShipping._id}/update-shipping-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shippingWeight: weight,
                    shippingWeightUnit: selectedWeightUnit,
                    shippingDimensions: {
                        length,
                        width,
                        height,
                        unit: selectedDimensionUnit
                    }
                })
            })

            if (response.ok) {
                const data = await response.json()
                showAlert(`Package details updated. Found ${data.totalRates} shipping options.`, 'success')
                setAvailableRates(data.availableRates || [])
            } else {
                const error = await response.json()
                showAlert(`Error updating shipping details: ${error.error || 'Unknown error'}`, 'error')
            }
        } catch (error) {
            console.error('Error updating shipping details:', error)
            showAlert('Failed to update shipping details.', 'error')
        } finally {
            setLoadingRates(false)
        }
    }

    const handleSelectShippingRate = async () => {
        if (!selectedOrderForShipping || !selectedRateId) return

        const selectedRate = availableRates.find(rate => rate.rateId === selectedRateId)
        if (!selectedRate) return

        setApplyingRate(true)
        try {
            const response = await fetch(`/api/admin/orders/${selectedOrderForShipping._id}/update-shipping-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedRateId: selectedRateId,
                    rateDetails: selectedRate
                })
            })

            if (response.ok) {
                const data = await response.json()
                showAlert('Shipping rate applied successfully!', 'success')

                if (data.priceChanged) {
                    showAlert('Order total has been updated. Customer will be notified.', 'info')
                }

                fetchOrders() // Refresh orders
                setShowShippingModal(false)
                setSelectedOrderForShipping(null)
                setAvailableRates([])
                setSelectedRateId('')
            } else {
                const error = await response.json()
                showAlert(`Error applying shipping rate: ${error.error || 'Unknown error'}`, 'error')
            }
        } catch (error) {
            console.error('Error applying shipping rate:', error)
            showAlert('Failed to apply shipping rate.', 'error')
        } finally {
            setApplyingRate(false)
        }
    }

    const toggleOrderExpansion = (orderId: string) => {
        const newExpanded = new Set(expandedOrders)
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId)
        } else {
            newExpanded.add(orderId)
        }
        setExpandedOrders(newExpanded)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'approved': return 'bg-green-100 text-green-800 border-green-200'
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
            case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'pending_payment_adjustment': return 'bg-orange-100 text-orange-800 border-orange-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-50 text-yellow-700'
            case 'pending_approval': return 'bg-yellow-50 text-yellow-700'
            case 'pending_adjustment': return 'bg-orange-50 text-orange-700'
            case 'captured': return 'bg-green-50 text-green-700'
            case 'succeeded': return 'bg-green-50 text-green-700'
            case 'failed': return 'bg-red-50 text-red-700'
            case 'cancelled': return 'bg-gray-50 text-gray-700'
            default: return 'bg-gray-50 text-gray-700'
        }
    }

    const canApproveOrder = (order: Order) => {
        // Check basic approval requirements
        if (order.status !== 'pending_approval' || order.paymentStatus !== 'pending_approval') {
            return false
        }

        // Check shipping requirements
        const hasShippingWeight = order.shippingWeight && order.shippingWeight > 0
        const hasShippingDimensions = order.shippingDimensions &&
            order.shippingDimensions.length > 0 &&
            order.shippingDimensions.width > 0 &&
            order.shippingDimensions.height > 0
        const hasShippingRate = order.shippoShipment?.rateId

        return hasShippingWeight && hasShippingDimensions && hasShippingRate
    }

    const getShippingRequirementStatus = (order: Order) => {
        const requirements = {
            weight: order.shippingWeight && order.shippingWeight > 0,
            dimensions: order.shippingDimensions &&
                order.shippingDimensions.length > 0 &&
                order.shippingDimensions.width > 0 &&
                order.shippingDimensions.height > 0,
            rate: order.shippoShipment?.rateId
        }

        const missing = []
        if (!requirements.weight) missing.push('Weight')
        if (!requirements.dimensions) missing.push('Dimensions')
        if (!requirements.rate) missing.push('Shipping Rate')

        return {
            allSet: missing.length === 0,
            missing
        }
    }

    const canRejectOrder = (order: Order) => {
        return order.status === 'pending_approval'
    }

    const canUpdateShipping = (order: Order) => {
        return !['shipped', 'delivered', 'rejected', 'cancelled'].includes(order.status)
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
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Manage customer orders, approvals, and shipping details
                        </p>
                    </div>
                    <Link href="/admin" className="btn-secondary">
                        Back to Dashboard
                    </Link>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500 text-lg">No orders found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {/* Order Header */}
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <button
                                                onClick={() => toggleOrderExpansion(order._id)}
                                                className="p-1 hover:bg-gray-100 rounded"
                                            >
                                                <svg
                                                    className={`w-5 h-5 transform transition-transform ${expandedOrders.has(order._id) ? 'rotate-90' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {order.orderNumber}
                                                    </h3>
                                                    {order.isPriceAdjusted && (
                                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-800">
                                                            Price Adjusted
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-4 mt-1">
                                                    <span className="text-sm text-gray-600">
                                                        {order.shippingAddress.name}
                                                    </span>
                                                    <span className="text-sm text-gray-400">•</span>
                                                    <span className="text-sm text-gray-600">
                                                        {order.customerEmail}
                                                    </span>
                                                    <span className="text-sm text-gray-400">•</span>
                                                    <span className="text-sm text-gray-600">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <div className="text-lg font-semibold text-gray-900">
                                                    ${order.total.toFixed(2)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                            <div className="flex flex-col space-y-2">
                                                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                                                    {order.status.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                                                    {order.paymentStatus.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Order Actions */}
                                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            {/* Shipping Requirements Warning */}
                                            {order.status === 'pending_approval' && !canApproveOrder(order) && (
                                                <div className="flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                                    <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                    </svg>
                                                    <span className="text-sm text-yellow-800">
                                                        Missing: {getShippingRequirementStatus(order).missing.join(', ')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Primary Actions */}
                                            {canApproveOrder(order) && (
                                                <button
                                                    onClick={() => handleApproveClick(order._id)}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Approve
                                                </button>
                                            )}
                                            {order.status === 'pending_approval' && !canApproveOrder(order) && (
                                                <button
                                                    disabled
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                                                    title="Complete shipping setup before approval"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Approve (Shipping Required)
                                                </button>
                                            )}
                                            {canRejectOrder(order) && (
                                                <button
                                                    onClick={() => handleRejectClick(order._id)}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Reject
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {/* Secondary Actions */}
                                            {canUpdateShipping(order) && (
                                                <button
                                                    onClick={() => handleOpenShippingModal(order)}
                                                    className={`inline-flex items-center px-3 py-2 border text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${!canApproveOrder(order) && order.status === 'pending_approval'
                                                        ? 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 focus:ring-orange-500'
                                                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500'
                                                        }`}
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                    {!canApproveOrder(order) && order.status === 'pending_approval' ? 'Setup Shipping' : 'Shipping'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order)
                                                    setShowEmailModal(true)
                                                }}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Email
                                            </button>
                                            <Link
                                                href={`/admin/orders/${order._id}`}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Order Details */}
                                {expandedOrders.has(order._id) && (
                                    <div className="px-6 py-4 space-y-4">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Order Items */}
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900 mb-3">Order Items</h4>
                                                <div className="space-y-2">
                                                    {order.items.map((item, index) => (
                                                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                                            <div>
                                                                <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                                                <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                                                            </div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                ${(item.price * item.quantity).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Order Total Breakdown */}
                                                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                                    <div className="space-y-1 text-sm">
                                                        {order.subtotal && (
                                                            <div className="flex justify-between">
                                                                <span>Subtotal:</span>
                                                                <span>${order.subtotal.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {order.shippingCost && (
                                                            <div className="flex justify-between">
                                                                <span>Shipping:</span>
                                                                <span>${order.shippingCost.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {order.tax && (
                                                            <div className="flex justify-between">
                                                                <span>Tax:</span>
                                                                <span>${order.tax.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between font-semibold border-t pt-1">
                                                            <span>Total:</span>
                                                            <span>${order.total.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Shipping & Payment Info */}
                                            <div className="space-y-4">
                                                {/* Shipping Address */}
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Address</h4>
                                                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                                        <div>{order.shippingAddress.name}</div>
                                                        <div>{order.shippingAddress.line1}</div>
                                                        {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                                                        <div>
                                                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}
                                                        </div>
                                                        <div>{order.shippingAddress.country}</div>
                                                    </div>
                                                </div>

                                                {/* Shipping Details */}
                                                {(order.shippingWeight || order.shippingDimensions || order.shippoShipment) && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Shipping Details</h4>
                                                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md space-y-1">
                                                            {order.shippingWeight && (
                                                                <div>Weight: {order.shippingWeight} lbs</div>
                                                            )}
                                                            {order.shippingDimensions && (
                                                                <div>
                                                                    Dimensions: {order.shippingDimensions.length}" × {order.shippingDimensions.width}" × {order.shippingDimensions.height}"
                                                                </div>
                                                            )}
                                                            {order.shippoShipment?.carrier && (
                                                                <div>Carrier: {order.shippoShipment.carrier}</div>
                                                            )}
                                                            {order.shippoShipment?.serviceLevelName && (
                                                                <div>Service: {order.shippoShipment.serviceLevelName}</div>
                                                            )}
                                                            {order.shippoShipment?.trackingNumber && (
                                                                <div>Tracking: {order.shippoShipment.trackingNumber}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Admin Notes */}
                                                {order.adminApproval?.adminNotes && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Admin Notes</h4>
                                                        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
                                                            {order.adminApproval.adminNotes}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rejection Reason */}
                                                {order.adminApproval?.rejectionReason && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Rejection Reason</h4>
                                                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                                            {order.adminApproval.rejectionReason}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

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
                        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Update Shipping Details for Order {selectedOrderForShipping.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-600 mb-1">Current Total: ${selectedOrderForShipping.total.toFixed(2)}</p>
                            {selectedOrderForShipping.shippoShipment?.cost && (
                                <p className="text-sm text-gray-600 mb-4">Current Shipping Cost: ${selectedOrderForShipping.shippoShipment.cost.toFixed(2)}</p>
                            )}

                            {/* Unit System Selection */}
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 mb-3">📏 Measurement System</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Weight Unit</label>
                                        <div className="flex space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="weightUnit"
                                                    value="lb"
                                                    checked={selectedWeightUnit === 'lb'}
                                                    onChange={(e) => setSelectedWeightUnit(e.target.value as 'lb')}
                                                    className="mr-2 text-blue-600"
                                                />
                                                <span className="text-sm">Pounds (lb) - US Imperial</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="weightUnit"
                                                    value="kg"
                                                    checked={selectedWeightUnit === 'kg'}
                                                    onChange={(e) => setSelectedWeightUnit(e.target.value as 'kg')}
                                                    className="mr-2 text-blue-600"
                                                />
                                                <span className="text-sm">Kilograms (kg) - Metric</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Dimension Unit</label>
                                        <div className="flex space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="dimensionUnit"
                                                    value="in"
                                                    checked={selectedDimensionUnit === 'in'}
                                                    onChange={(e) => setSelectedDimensionUnit(e.target.value as 'in')}
                                                    className="mr-2 text-blue-600"
                                                />
                                                <span className="text-sm">Inches (in) - US Imperial</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="dimensionUnit"
                                                    value="cm"
                                                    checked={selectedDimensionUnit === 'cm'}
                                                    onChange={(e) => setSelectedDimensionUnit(e.target.value as 'cm')}
                                                    className="mr-2 text-blue-600"
                                                />
                                                <span className="text-sm">Centimeters (cm) - Metric</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-blue-700 mt-2">
                                    💡 All measurements are converted to US Imperial for shipping calculations (Shippo API requirement)
                                </p>
                            </div>

                            {/* Package Details Section */}
                            <div className="space-y-4 mb-6">
                                <h4 className="text-md font-medium text-gray-900">Package Details</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Shipping Weight ({selectedWeightUnit})
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={shippingWeightInput}
                                            onChange={(e) => setShippingWeightInput(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder={`Weight in ${selectedWeightUnit}`}
                                        />
                                        <span className="text-sm text-gray-500 font-medium">{selectedWeightUnit}</span>
                                    </div>
                                    {selectedWeightUnit === 'kg' && shippingWeightInput && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ≈ {(parseFloat(shippingWeightInput) * 2.20462).toFixed(2)} lb
                                        </p>
                                    )}
                                    {selectedWeightUnit === 'lb' && shippingWeightInput && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ≈ {(parseFloat(shippingWeightInput) * 0.453592).toFixed(2)} kg
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Length ({selectedDimensionUnit})
                                        </label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={shippingLengthInput}
                                                onChange={(e) => setShippingLengthInput(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Length"
                                            />
                                            <span className="text-sm text-gray-500 font-medium">{selectedDimensionUnit}</span>
                                        </div>
                                        {selectedDimensionUnit === 'cm' && shippingLengthInput && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                ≈ {(parseFloat(shippingLengthInput) * 0.393701).toFixed(1)} in
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Width ({selectedDimensionUnit})
                                        </label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={shippingWidthInput}
                                                onChange={(e) => setShippingWidthInput(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Width"
                                            />
                                            <span className="text-sm text-gray-500 font-medium">{selectedDimensionUnit}</span>
                                        </div>
                                        {selectedDimensionUnit === 'cm' && shippingWidthInput && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                ≈ {(parseFloat(shippingWidthInput) * 0.393701).toFixed(1)} in
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Height ({selectedDimensionUnit})
                                        </label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={shippingHeightInput}
                                                onChange={(e) => setShippingHeightInput(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Height"
                                            />
                                            <span className="text-sm text-gray-500 font-medium">{selectedDimensionUnit}</span>
                                        </div>
                                        {selectedDimensionUnit === 'cm' && shippingHeightInput && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                ≈ {(parseFloat(shippingHeightInput) * 0.393701).toFixed(1)} in
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleUpdateShippingDetails}
                                    disabled={loadingRates}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loadingRates ? 'Getting Rates...' : 'Get Shipping Rates'}
                                </button>
                            </div>

                            {/* Shipping Rates Selection */}
                            {availableRates.length > 0 && (
                                <div className="space-y-4 mb-6">
                                    <h4 className="text-md font-medium text-gray-900">
                                        Select Shipping Service ({availableRates.length} options available)
                                    </h4>
                                    <div className="max-h-64 overflow-y-auto space-y-3">
                                        {availableRates.map((rate) => (
                                            <div
                                                key={rate.rateId}
                                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedRateId === rate.rateId
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                onClick={() => setSelectedRateId(rate.rateId)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="radio"
                                                            checked={selectedRateId === rate.rateId}
                                                            onChange={() => setSelectedRateId(rate.rateId)}
                                                            className="text-purple-600"
                                                        />
                                                        {rate.providerImage && (
                                                            <img
                                                                src={rate.providerImage}
                                                                alt={rate.carrier}
                                                                className="w-8 h-8"
                                                            />
                                                        )}
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {rate.serviceName}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {rate.deliveryEstimate}
                                                            </div>
                                                            {rate.attributes.length > 0 && (
                                                                <div className="text-xs text-gray-500">
                                                                    {rate.attributes.join(', ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-gray-900">
                                                            ${rate.cost.toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {rate.currency}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleSelectShippingRate}
                                        disabled={!selectedRateId || applyingRate}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {applyingRate ? 'Applying Rate...' : 'Apply Selected Rate'}
                                    </button>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex space-x-3 pt-4 border-t">
                                <button
                                    onClick={() => {
                                        setShowShippingModal(false)
                                        setSelectedOrderForShipping(null)
                                        setAvailableRates([])
                                        setSelectedRateId('')
                                        // Reset unit selections to defaults
                                        setSelectedWeightUnit('lb')
                                        setSelectedDimensionUnit('in')
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>

                            <p className="text-xs text-gray-500 mt-4">
                                📏 Choose your preferred measurement system. All units are automatically converted to US Imperial (inches/pounds) for shipping rate calculations as required by Shippo API.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
