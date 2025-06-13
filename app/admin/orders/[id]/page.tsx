'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePopup } from '@/lib/contexts/PopupContext'
import OrderStatus from '@/components/admin/OrderStatus'
import ShippingModal from '@/components/admin/ShippingModal'

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
        unit?: 'in' | 'cm'
    }
    shippingWeightUnit?: 'lb' | 'kg'
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
    paymentToken?: string
    paymentTokenExpiry?: string
}

export default function AdminOrderDetailsPage() {
    const params = useParams()
    const orderId = params.id as string

    const [order, setOrder] = useState<OrderDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [showShippingModal, setShowShippingModal] = useState(false)
    const [taxInput, setTaxInput] = useState('')
    const [updatingTax, setUpdatingTax] = useState(false)
    const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false)
    const [regeneratingPaymentLink, setRegeneratingPaymentLink] = useState(false)
    const [markingShipped, setMarkingShipped] = useState(false)
    const [shippingUpdateLoading, setShippingUpdateLoading] = useState(false)

    const { showAlert } = usePopup()

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails()
        }
    }, [orderId])

    const fetchOrderDetails = async () => {
        try {
            console.log('Fetching order details for ID:', orderId)
            const response = await fetch(`/api/admin/orders/${orderId}`)
            const data = await response.json()

            console.log('Order fetch response:', { status: response.status, data })

            if (response.ok) {
                setOrder(data.order)
                setTaxInput(data.order.tax.toFixed(2))
            } else {
                console.error('Failed to fetch order:', data)
                showAlert(data.error || 'Failed to load order details', 'error')
            }
        } catch (error) {
            console.error('Error fetching order:', error)
            showAlert('Failed to load order details', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateTax = async () => {
        if (!order || taxInput === '') {
            showAlert('Invalid tax amount.', 'warning');
            return;
        }
        const newTax = parseFloat(taxInput);
        if (isNaN(newTax) || newTax < 0) {
            showAlert('Tax amount must be a positive number.', 'warning');
            return;
        }

        setUpdatingTax(true);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/edit-tax`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newTaxAmount: newTax, setTaxFlag: true }),
            });
            const data = await response.json();
            if (response.ok) {
                setOrder(data.order);
                setTaxInput(data.order.tax.toFixed(2));
                showAlert(data.message || 'Tax updated successfully!', 'success');
            } else {
                showAlert(data.error || 'Failed to update tax.', 'error');
            }
        } catch (error) {
            console.error('Error updating tax:', error);
            showAlert('An error occurred while updating tax.', 'error');
        } finally {
            setUpdatingTax(false);
        }
    };

    const handleGeneratePaymentLink = async () => {
        if (!order) return;

        // Check if tax has been set
        if (!order.isTaxSet) {
            showAlert('Please set the tax amount before generating a payment link.', 'warning');
            return;
        }

        setGeneratingPaymentLink(true);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/generate-payment-link`, {
                method: 'POST',
            });
            const data = await response.json();
            if (response.ok) {
                setOrder(data.order);
                showAlert(data.message || 'Payment link generated and sent!', 'success');
            } else {
                showAlert(data.error || 'Failed to generate payment link.', 'error');
            }
        } catch (error) {
            console.error('Error generating payment link:', error);
            showAlert('An error occurred.', 'error');
        } finally {
            setGeneratingPaymentLink(false);
        }
    };

    const handleRegeneratePaymentLink = async () => {
        if (!order) return;

        setRegeneratingPaymentLink(true);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/generate-payment-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ regenerate: true })
            });
            const data = await response.json();
            if (response.ok) {
                setOrder(data.order);
                showAlert(data.message || 'Payment link regenerated and sent!', 'success');
            } else {
                showAlert(data.error || 'Failed to regenerate payment link.', 'error');
            }
        } catch (error) {
            console.error('Error regenerating payment link:', error);
            showAlert('An error occurred.', 'error');
        } finally {
            setRegeneratingPaymentLink(false);
        }
    };

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

    const handleOrderUpdate = async () => {
        console.log('Order update triggered')
        setShippingUpdateLoading(true)
        try {
            await fetchOrderDetails()
            showAlert('Order details refreshed successfully', 'success')
        } catch (error) {
            console.error('Error updating order:', error)
            showAlert('Failed to refresh order details', 'error')
        } finally {
            setShippingUpdateLoading(false)
        }
    }

    const handleMarkShipped = async () => {
        if (!order) return;

        setMarkingShipped(true);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/mark-shipped`, {
                method: 'POST',
            });
            const data = await response.json();
            if (response.ok) {
                setOrder(data.order);
                showAlert(data.message || 'Order marked as shipped and customer notified!', 'success');
            } else {
                showAlert(data.error || 'Failed to mark order as shipped.', 'error');
            }
        } catch (error) {
            console.error('Error marking order as shipped:', error);
            showAlert('An error occurred.', 'error');
        } finally {
            setMarkingShipped(false);
        }
    };

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
                                ['pending_approval', 'accepted'].includes(order.status)
                                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                                : ''} btn-primary`}
                            disabled={['shipped', 'delivered', 'cancelled', 'rejected'].includes(order.status)}
                        >
                            {!getShippingCompletionStatus().complete &&
                                ['pending_approval', 'accepted'].includes(order.status)
                                ? 'Setup Shipping'
                                : 'Manage Shipping'}
                        </button>

                        {order.status === 'processing' && order.paymentStatus === 'captured' && order.shippoShipment?.labelUrl && (
                            <button
                                onClick={handleMarkShipped}
                                disabled={markingShipped}
                                className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            >
                                {markingShipped ? 'Marking Shipped...' : 'Mark as Shipped'}
                            </button>
                        )}

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

                {/* Order Status Component */}
                <OrderStatus
                    status={order.status}
                    paymentStatus={order.paymentStatus}
                    total={order.total}
                    isPriceAdjusted={order.isPriceAdjusted}
                    orderNumber={order.orderNumber}
                    createdAt={order.createdAt}
                />

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
                                        {order.shippingCost === 0 && order.items.length > 0 ? (
                                            <span className="text-green-600 font-medium">FREE</span>
                                        ) : (
                                            `$${order.shippingCost.toFixed(2)}`
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <label htmlFor="tax-edit" className="font-medium">Tax:</label>
                                    {['pending_approval', 'accepted'].includes(order.status) && !order.paymentToken ? (
                                        <div className="flex items-center">
                                            <span className="mr-1">$</span>
                                            <input
                                                id="tax-edit"
                                                type="number"
                                                step="0.01"
                                                value={taxInput}
                                                onChange={(e) => setTaxInput(e.target.value)}
                                                onBlur={handleUpdateTax}
                                                disabled={updatingTax || !(['pending_approval', 'accepted'].includes(order.status))}
                                                className="w-20 px-1 py-0.5 border border-gray-300 rounded-md text-sm text-right focus:ring-purple-500 focus:border-purple-500"
                                            />
                                            {updatingTax && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 ml-2"></div>}
                                        </div>
                                    ) : (
                                        <span>${order.tax.toFixed(2)}</span>
                                    )}
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
                                        <div><strong>Weight:</strong> {order.shippingWeight} {order.shippingWeightUnit || 'lbs'}</div>
                                    )}
                                    {order.shippingDimensions && (
                                        <div>
                                            <strong>Dimensions:</strong> {order.shippingDimensions.length}" × {order.shippingDimensions.width}" × {order.shippingDimensions.height}" {order.shippingDimensions.unit || 'in'}
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
                                            {['accepted', 'pending_payment', 'processing', 'shipped', 'delivered'].includes(order.status) ? (
                                                <a
                                                    href={order.shippoShipment.labelUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Download Shipping Label
                                                </a>
                                            ) : (
                                                <span className="text-gray-500 inline-flex items-center" title="Label not available">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                    Shipping Label Not Available
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {order.status === 'accepted' && order.shippoShipment?.labelUrl && order.isTaxSet && !order.paymentToken && (
                                        <div className="mt-4">
                                            <button
                                                onClick={handleGeneratePaymentLink}
                                                disabled={generatingPaymentLink}
                                                className="btn-primary bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 w-full"
                                            >
                                                {generatingPaymentLink ? 'Generating Link...' : 'Get Payment Link for Customer'}
                                            </button>
                                        </div>
                                    )}
                                    {order.status === 'accepted' && order.shippoShipment?.labelUrl && !order.isTaxSet && (
                                        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-700">
                                            ⚠️ Please set the tax amount above before generating a payment link.
                                        </div>
                                    )}
                                    {order.paymentToken && order.status === 'pending_payment' && (
                                        <div className="mt-4 space-y-3">
                                            <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-700">
                                                Payment link sent. Token: ...{order.paymentToken.slice(-8)}. Expires: {new Date(order.paymentTokenExpiry!).toLocaleString()}
                                            </div>
                                            <button
                                                onClick={handleRegeneratePaymentLink}
                                                disabled={regeneratingPaymentLink}
                                                className="btn-primary bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 w-full"
                                            >
                                                {regeneratingPaymentLink ? 'Regenerating Link...' : '🔄 Regenerate Payment Link'}
                                            </button>
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
                    <ShippingModal
                        order={order}
                        isOpen={showShippingModal}
                        onClose={() => setShowShippingModal(false)}
                        onOrderUpdate={handleOrderUpdate}
                    />
                )}
            </div>
        </div>
    )
}
