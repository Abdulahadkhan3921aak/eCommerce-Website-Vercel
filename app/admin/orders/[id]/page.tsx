'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePopup } from '@/lib/contexts/PopupContext'

interface OrderDetails {
    _id: string
    orderNumber: string
    customerEmail: string
    customerPhone?: string
    total: number
    subtotal: number
    shippingCost: number
    tax: number
    status: string
    paymentStatus: string
    createdAt: string
    items: Array<{
        productId: string
        name: string
        price: number
        quantity: number
        size?: string
        color?: string
        image?: string
    }>
    shippingAddress: {
        name: string
        line1: string
        line2?: string
        city: string
        state: string
        postal_code: string
        country: string
        phone?: string
        email?: string
        residential?: boolean
    }
    billingAddress?: {
        name?: string
        line1?: string
        line2?: string
        city?: string
        state?: string
        postal_code?: string
        country?: string
        phone?: string
        email?: string
    }
    shippoShipment?: {
        rateId?: string
        carrier?: string
        serviceLevelToken?: string
        serviceLevelName?: string
        cost?: number
        estimatedDeliveryDays?: number
        trackingNumber?: string
        labelUrl?: string
        transactionId?: string
    }
    shippingWeight?: number
    shippingDimensions?: {
        length: number
        width: number
        height: number
    }
    adminApproval?: {
        isApproved?: boolean
        approvedBy?: string
        approvedAt?: string
        rejectedBy?: string
        rejectedAt?: string
        rejectionReason?: string
        adminNotes?: string
    }
    emailHistory: Array<{
        sentBy: string
        type: string
        subject: string
        content: string
        sentAt: string
    }>
    isPriceAdjusted?: boolean
}

interface ShippingRate {
    rateId: string
    carrier: string
    serviceName: string
    serviceLevelToken: string
    serviceLevelName: string
    cost: number
    displayCost: number
    originalCost: number
    estimatedDays?: number
    deliveryEstimate: string
    isFreeShipping: boolean
    attributes: string[]
    providerImage?: string
}

export default function AdminOrderDetailsPage() {
    const params = useParams()
    const orderId = params.id as string

    const [order, setOrder] = useState<OrderDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
    const [selectedRateId, setSelectedRateId] = useState<string>('')

    // Package details form
    const [weight, setWeight] = useState('')
    const [length, setLength] = useState('')
    const [width, setWidth] = useState('')
    const [height, setHeight] = useState('')

    // UI states
    const [showShippingModal, setShowShippingModal] = useState(false)
    const [loadingRates, setLoadingRates] = useState(false)
    const [selectingRate, setSelectingRate] = useState(false)
    const [creatingLabel, setCreatingLabel] = useState(false)

    const { showAlert, showPopup } = usePopup()

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails()
        }
    }, [orderId])

    const fetchOrderDetails = async () => {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}`)
            const data = await response.json()

            if (response.ok) {
                setOrder(data.order)
                // Pre-fill package details if available
                if (data.order.shippingWeight) setWeight(data.order.shippingWeight.toString())
                if (data.order.shippingDimensions) {
                    setLength(data.order.shippingDimensions.length.toString())
                    setWidth(data.order.shippingDimensions.width.toString())
                    setHeight(data.order.shippingDimensions.height.toString())
                }
            } else {
                showAlert(data.error || 'Failed to load order details', 'error')
            }
        } catch (error) {
            console.error('Error fetching order:', error)
            showAlert('Failed to load order details', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleGetShippingRates = async () => {
        if (!weight || !length || !width || !height) {
            showAlert('Please enter all package details', 'warning')
            return
        }

        setLoadingRates(true)
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/update-shipping-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shippingWeight: parseFloat(weight),
                    shippingDimensions: {
                        length: parseFloat(length),
                        width: parseFloat(width),
                        height: parseFloat(height)
                    }
                })
            })

            const data = await response.json()

            if (response.ok) {
                // Convert the response to match the expected ShippingRate format
                const formattedRates: ShippingRate[] = data.availableRates?.map((rate: any) => ({
                    rateId: rate.rateId,
                    carrier: rate.carrier,
                    serviceName: rate.serviceName,
                    serviceLevelToken: rate.serviceLevelToken,
                    serviceLevelName: rate.serviceLevelName,
                    cost: rate.cost,
                    displayCost: rate.cost,
                    originalCost: rate.cost,
                    estimatedDays: rate.estimatedDays,
                    deliveryEstimate: rate.deliveryEstimate,
                    isFreeShipping: false, // This can be enhanced based on business logic
                    attributes: rate.attributes || [],
                    providerImage: rate.providerImage
                })) || []

                setShippingRates(formattedRates)
                showAlert(`Found ${formattedRates.length} shipping options`, 'success')
            } else {
                showAlert(data.error || 'Failed to get shipping rates', 'error')
            }
        } catch (error) {
            console.error('Error getting shipping rates:', error)
            showAlert('Failed to get shipping rates', 'error')
        } finally {
            setLoadingRates(false)
        }
    }

    const handleSelectRate = async (rateId: string) => {
        const selectedRate = shippingRates.find(r => r.rateId === rateId)
        if (!selectedRate) return

        setSelectingRate(true)
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/update-shipping-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedRateId: rateId,
                    rateDetails: {
                        rateId: selectedRate.rateId,
                        carrier: selectedRate.carrier,
                        serviceName: selectedRate.serviceName,
                        serviceLevelToken: selectedRate.serviceLevelToken,
                        serviceLevelName: selectedRate.serviceLevelName,
                        cost: selectedRate.cost,
                        estimatedDays: selectedRate.estimatedDays
                    }
                })
            })

            const data = await response.json()

            if (response.ok) {
                setOrder(data.order)
                setSelectedRateId(rateId)
                showAlert('Shipping rate selected successfully', 'success')

                if (data.priceChanged) {
                    showAlert('Order total has been updated with new shipping cost', 'info')
                }
            } else {
                showAlert(data.error || 'Failed to select shipping rate', 'error')
            }
        } catch (error) {
            console.error('Error selecting shipping rate:', error)
            showAlert('Failed to select shipping rate', 'error')
        } finally {
            setSelectingRate(false)
        }
    }

    const handleCreateLabel = async () => {
        if (!order?.shippoShipment?.rateId && !selectedRateId) {
            showAlert('Please select a shipping rate first', 'warning')
            return
        }

        showPopup({
            title: 'Create Shipping Label',
            message: 'This will create a shipping label and update the order status. Continue?',
            type: 'confirm',
            actions: [
                {
                    label: 'Cancel',
                    action: () => { },
                    variant: 'secondary'
                },
                {
                    label: 'Create Label',
                    action: async () => {
                        setCreatingLabel(true)
                        try {
                            const response = await fetch(`/api/admin/orders/${orderId}/shipping`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'create_label',
                                    rateId: selectedRateId || order?.shippoShipment?.rateId,
                                    labelFileType: 'PDF_4x6'
                                })
                            })

                            const data = await response.json()

                            if (response.ok) {
                                setOrder(data.order)
                                showAlert('Shipping label created successfully!', 'success')

                                if (data.transaction.labelUrl) {
                                    // Open label in new tab
                                    window.open(data.transaction.labelUrl, '_blank')
                                }
                            } else {
                                showAlert(data.error || 'Failed to create shipping label', 'error')
                            }
                        } catch (error) {
                            console.error('Error creating shipping label:', error)
                            showAlert('Failed to create shipping label', 'error')
                        } finally {
                            setCreatingLabel(false)
                        }
                    },
                    variant: 'primary'
                }
            ]
        })
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

    const getShippingCompletionStatus = () => {
        if (!order) return { complete: false, missing: [] }

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
        if (!requirements.rate) missing.push('Rate Selection')

        return {
            complete: missing.length === 0,
            missing
        }
    }

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

    if (!order) {
        return (
            <div className="min-h-screen bg-white">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center">
                        <p className="text-lg text-gray-600">Order not found</p>
                        <Link href="/admin/orders" className="mt-4 btn-primary">
                            Back to Orders
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Order {order.orderNumber} • {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowShippingModal(true)}
                            className={`${!getShippingCompletionStatus().complete &&
                                ['pending_approval', 'approved'].includes(order.status)
                                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                                : ''} btn-primary`}
                            disabled={['shipped', 'delivered', 'cancelled'].includes(order.status)}
                        >
                            {!getShippingCompletionStatus().complete &&
                                ['pending_approval', 'approved'].includes(order.status)
                                ? 'Complete Shipping Setup'
                                : 'Manage Shipping'}
                        </button>
                        <Link href="/admin/orders" className="btn-secondary">
                            Back to Orders
                        </Link>
                    </div>
                </div>

                {/* Shipping Requirements Alert */}
                {!getShippingCompletionStatus().complete &&
                    ['pending_approval', 'approved'].includes(order.status) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Shipping Setup Required
                                    </h3>
                                    <p className="mt-1 text-sm text-yellow-700">
                                        This order cannot be approved or processed until shipping details are complete.
                                        Missing: {getShippingCompletionStatus().missing.join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                {/* Order Status */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Status</h2>
                            <div className="flex items-center space-x-4">
                                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(order.status)}`}>
                                    {order.status.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-600">
                                    Payment: {order.paymentStatus.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                                ${order.total.toFixed(2)}
                            </div>
                            {order.isPriceAdjusted && (
                                <span className="text-sm text-orange-600 font-medium">
                                    Price Adjusted
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Items */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                        <div className="space-y-4">
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
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-gray-900">
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
                                    <span>${order.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Shipping:</span>
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

                    {/* Customer & Shipping Info */}
                    <div className="space-y-6">
                        {/* Customer Info */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
                            <div className="space-y-2 text-sm">
                                <div><strong>Email:</strong> {order.customerEmail}</div>
                                {order.customerPhone && (
                                    <div><strong>Phone:</strong> {order.customerPhone}</div>
                                )}
                            </div>
                        </div>

                        {/* Shipping Address */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
                            <div className="text-sm text-gray-600">
                                <div className="font-medium text-gray-900">{order.shippingAddress.name}</div>
                                <div>{order.shippingAddress.line1}</div>
                                {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
                                <div>
                                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal_code}
                                </div>
                                <div>{order.shippingAddress.country}</div>
                                {order.shippingAddress.residential && (
                                    <div className="mt-2 text-xs text-blue-600">Residential Address</div>
                                )}
                            </div>
                        </div>

                        {/* Shipping Details */}
                        {(order.shippingWeight || order.shippingDimensions || order.shippoShipment) && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Details</h2>
                                <div className="space-y-2 text-sm">
                                    {order.shippingWeight && (
                                        <div><strong>Weight:</strong> {order.shippingWeight} lbs</div>
                                    )}
                                    {order.shippingDimensions && (
                                        <div>
                                            <strong>Dimensions:</strong> {order.shippingDimensions.length}" × {order.shippingDimensions.width}" × {order.shippingDimensions.height}"
                                        </div>
                                    )}
                                    {order.shippoShipment?.carrier && (
                                        <div><strong>Carrier:</strong> {order.shippoShipment.carrier}</div>
                                    )}
                                    {order.shippoShipment?.serviceLevelName && (
                                        <div><strong>Service:</strong> {order.shippoShipment.serviceLevelName}</div>
                                    )}
                                    {order.shippoShipment?.trackingNumber && (
                                        <div><strong>Tracking:</strong> {order.shippoShipment.trackingNumber}</div>
                                    )}
                                    {order.shippoShipment?.labelUrl && (
                                        <div>
                                            <a
                                                href={order.shippoShipment.labelUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                View Shipping Label
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Email History */}
                {order.emailHistory.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email History</h2>
                        <div className="space-y-4">
                            {order.emailHistory.map((email, index) => (
                                <div key={index} className="border-l-4 border-blue-200 pl-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{email.subject}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{email.content}</p>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(email.sentAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shipping Management Modal */}
                {showShippingModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Shipping Management
                                </h3>
                                <button
                                    onClick={() => setShowShippingModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Package Details */}
                            <div className="mb-6">
                                <h4 className="text-lg font-medium text-gray-900 mb-4">Package Details</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Weight (lbs)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Length (in)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={length}
                                            onChange={(e) => setLength(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Width (in)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={width}
                                            onChange={(e) => setWidth(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Height (in)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleGetShippingRates}
                                    disabled={loadingRates}
                                    className="mt-4 btn-primary"
                                >
                                    {loadingRates ? 'Getting Rates...' : 'Get Shipping Rates'}
                                </button>
                            </div>

                            {/* Shipping Rates */}
                            {shippingRates.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                                        Available Shipping Options
                                    </h4>
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {shippingRates.map((rate) => (
                                            <div
                                                key={rate.rateId}
                                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedRateId === rate.rateId
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                onClick={() => setSelectedRateId(rate.rateId)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
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
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-gray-900">
                                                            ${rate.displayCost.toFixed(2)}
                                                        </div>
                                                        {rate.isFreeShipping && rate.originalCost > 0 && (
                                                            <div className="text-xs text-green-600">
                                                                Free shipping applied!
                                                            </div>
                                                        )}
                                                        {rate.displayCost !== rate.originalCost && (
                                                            <div className="text-xs text-gray-500 line-through">
                                                                ${rate.originalCost.toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex space-x-3 mt-4">
                                        <button
                                            onClick={() => handleSelectRate(selectedRateId)}
                                            disabled={!selectedRateId || selectingRate}
                                            className="btn-primary"
                                        >
                                            {selectingRate ? 'Selecting...' : 'Select Rate'}
                                        </button>

                                        {(order.shippoShipment?.rateId || selectedRateId) && (
                                            <button
                                                onClick={handleCreateLabel}
                                                disabled={creatingLabel}
                                                className="btn-secondary"
                                            >
                                                {creatingLabel ? 'Creating Label...' : 'Create Shipping Label'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
