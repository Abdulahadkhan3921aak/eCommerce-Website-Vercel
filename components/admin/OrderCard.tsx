'use client'

import { useState } from 'react'
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
    status: string
    paymentStatus: string
    paymentMethod?: string
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
        state: string
        postal_code: string
        country: 'US'
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
    isPriceAdjusted?: boolean
    originalOrderId?: string
    emailHistory?: Array<{
        sentBy: string
        type: string
        subject: string
        content: string
        sentAt: string
    }>
    paymentToken?: string
    isCustomOrder?: boolean // Add custom order flag
    customOrderDetails?: {
        category: string
        title: string
        description?: string
        sizes: string
        engraving?: string
        notes?: string
    }
}

interface OrderCardProps {
    order: Order
    expanded: boolean
    onToggleExpand: () => void
    onAccept: (orderId: string) => void
    onReject: (orderId: string) => void
    onRemove: (orderId: string) => void
    onOpenShipping: (order: Order) => void
    onOpenEmail: (order: Order) => void
    onGeneratePaymentLink?: (orderId: string) => void
    onRegeneratePaymentLink?: (orderId: string) => void
    onMarkShipped?: (orderId: string) => void
    onEditCustomItem?: (order: any, itemIndex: number) => void
    generatingPaymentLink?: boolean
    regeneratingPaymentLink?: boolean
    markingShipped?: boolean
}

export default function OrderCard({
    order,
    expanded,
    onToggleExpand,
    onAccept,
    onReject,
    onRemove,
    onOpenShipping,
    onOpenEmail,
    onGeneratePaymentLink,
    onRegeneratePaymentLink,
    onMarkShipped,
    onEditCustomItem,
    generatingPaymentLink = false,
    regeneratingPaymentLink = false,
    markingShipped = false
}: OrderCardProps) {
    const { showAlert } = usePopup()

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'approved': return 'bg-green-100 text-green-800 border-green-200'
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
            case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'pending_payment': return 'bg-orange-100 text-orange-800 border-orange-200'
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

    const hasShippingLabel = () => order.shippoShipment?.labelUrl
    const canGetPaymentLink = () => order.status === 'accepted' && order.shippoShipment?.labelUrl && !order.paymentToken && order.isTaxSet
    const canRegeneratePaymentLink = () => order.status === 'pending_payment' && order.paymentToken
    const canDownloadLabel = () => order.shippoShipment?.labelUrl && ['accepted', 'pending_payment', 'processing', 'shipped', 'delivered'].includes(order.status)
    const canMarkShipped = () => order.status === 'processing' && order.paymentStatus === 'captured' && order.shippoShipment?.labelUrl

    const copyPaymentLink = () => {
        if (order.paymentToken) {
            const paymentLink = `${window.location.origin}/payment/${order._id}?token=${order.paymentToken}`
            navigator.clipboard.writeText(paymentLink)
                .then(() => showAlert('Payment link copied to clipboard!', 'info'))
                .catch(() => showAlert('Could not copy payment link.', 'warning'))
        }
    }

    const renderCustomOrderInfo = () => {
        if (!order.isCustomOrder || !order.customOrderDetails) return null

        return (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center mb-3">
                    <span className="text-2xl mr-2">🎨</span>
                    <h4 className="font-semibold text-purple-800">Custom Order Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="font-medium text-purple-700">Category:</span>
                        <span className="ml-2 capitalize">{order.customOrderDetails.category}</span>
                    </div>
                    <div>
                        <span className="font-medium text-purple-700">Title:</span>
                        <span className="ml-2">{order.customOrderDetails.title}</span>
                    </div>
                    <div className="md:col-span-2">
                        <span className="font-medium text-purple-700">Sizes:</span>
                        <div className="ml-2 mt-1 flex items-center space-x-2">
                            <span>{order.customOrderDetails.sizes}</span>
                            {renderCustomSizeSVG(order.customOrderDetails.category, order.customOrderDetails.sizes)}
                        </div>
                    </div>
                    {order.customOrderDetails.engraving && (
                        <div className="md:col-span-2">
                            <span className="font-medium text-purple-700">Engraving:</span>
                            <span className="ml-2 italic">"{order.customOrderDetails.engraving}"</span>
                        </div>
                    )}
                    {order.customOrderDetails.description && (
                        <div className="md:col-span-2">
                            <span className="font-medium text-purple-700">Description:</span>
                            <p className="ml-2 mt-1 text-purple-600">{order.customOrderDetails.description}</p>
                        </div>
                    )}
                    {order.customOrderDetails.notes && (
                        <div className="md:col-span-2">
                            <span className="font-medium text-purple-700">Special Notes:</span>
                            <p className="ml-2 mt-1 text-purple-600">{order.customOrderDetails.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderCustomSizeSVG = (category: string, sizes: string) => {
        const sizeArray = sizes.split(',').map(s => s.trim()).slice(0, 3) // Show max 3 for space

        return (
            <div className="flex space-x-1">
                {sizeArray.map((size, index) => (
                    <div key={index} className="flex flex-col items-center">
                        {getSizeSVG(category, size)}
                    </div>
                ))}
                {sizes.split(',').length > 3 && (
                    <span className="text-xs text-purple-600 self-center ml-1">
                        +{sizes.split(',').length - 3} more
                    </span>
                )}
            </div>
        )
    }

    const getSizeSVG = (category: string, size: string) => {
        const strokeColor = '#9333ea'

        switch (category.toLowerCase()) {
            case 'ring':
                const ringSize = parseFloat(size) || 7
                const radius = Math.max(4, Math.min(8, ringSize * 0.8))
                return (
                    <svg width="20" height="20" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r={radius} fill="none" stroke={strokeColor} strokeWidth="1.5" />
                        <circle cx="10" cy="8" r="1.5" fill={strokeColor} opacity="0.7" />
                    </svg>
                )

            case 'bracelet':
                return (
                    <svg width="24" height="16" viewBox="0 0 24 16">
                        <ellipse cx="12" cy="8" rx="10" ry="6" fill="none" stroke={strokeColor} strokeWidth="1.5" />
                        <circle cx="8" cy="6" r="1" fill={strokeColor} opacity="0.7" />
                        <circle cx="16" cy="6" r="1" fill={strokeColor} opacity="0.7" />
                    </svg>
                )

            case 'necklace':
                return (
                    <svg width="20" height="24" viewBox="0 0 20 24">
                        <path d="M 4 4 Q 10 12 16 4 Q 10 16 4 4" fill="none" stroke={strokeColor} strokeWidth="1.5" />
                        <circle cx="10" cy="4" r="1.5" fill={strokeColor} opacity="0.7" />
                    </svg>
                )

            case 'earring':
                return (
                    <svg width="16" height="20" viewBox="0 0 16 20">
                        <circle cx="8" cy="4" r="2" fill="none" stroke={strokeColor} strokeWidth="1.5" />
                        <line x1="8" y1="6" x2="8" y2="14" stroke={strokeColor} strokeWidth="1.5" />
                        <circle cx="8" cy="14" r="1.5" fill={strokeColor} opacity="0.7" />
                    </svg>
                )

            default:
                return (
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <rect x="2" y="2" width="12" height="12" fill="none" stroke={strokeColor} strokeWidth="1.5" rx="2" />
                    </svg>
                )
        }
    }

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {/* Order Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onToggleExpand}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <svg
                                className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-90' : ''}`}
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
                                {order.isCustomOrder && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                        🎨 Custom Order
                                    </span>
                                )}
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
                        {/* Pending approval actions - Initial State */}
                        {order.status === 'pending_approval' && (
                            <>
                                <button
                                    onClick={() => onAccept(order._id)}
                                    className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => onReject(order._id)}
                                    className="btn-danger"
                                >
                                    Reject
                                </button>
                            </>
                        )}

                        {/* Accepted order actions - After Accept */}
                        {order.status === 'accepted' && (
                            <>
                                {!hasShippingLabel() && (
                                    <button
                                        onClick={() => onOpenShipping(order)}
                                        className="btn-primary bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
                                    >
                                        Setup Shipping
                                    </button>
                                )}

                                {hasShippingLabel() && (
                                    <>
                                        {canDownloadLabel() ? (
                                            <a
                                                href={order.shippoShipment!.labelUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-secondary inline-flex items-center"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                </svg>
                                                Download Label
                                            </a>
                                        ) : (
                                            <span className="btn-secondary opacity-50 cursor-not-allowed inline-flex items-center" title="Label not available">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                Label Not Available
                                            </span>
                                        )}

                                        {canGetPaymentLink() && onGeneratePaymentLink && (
                                            <button
                                                onClick={() => onGeneratePaymentLink(order._id)}
                                                className="btn-primary bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                                                disabled={generatingPaymentLink}
                                            >
                                                {generatingPaymentLink ? 'Generating...' : 'Get Payment Link'}
                                            </button>
                                        )}

                                        {/* Show warning if tax not set */}
                                        {order.status === 'accepted' && order.shippoShipment?.labelUrl && !order.isTaxSet && (
                                            <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                                ⚠️ Tax required for payment
                                            </span>
                                        )}
                                    </>
                                )}

                                <button
                                    onClick={() => onRemove(order._id)}
                                    className="btn-danger"
                                >
                                    Remove
                                </button>
                            </>
                        )}

                        {/* Pending payment order actions */}
                        {order.status === 'pending_payment' && (
                            <>
                                {canDownloadLabel() && (
                                    <a
                                        href={order.shippoShipment!.labelUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary inline-flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                        </svg>
                                        Download Label
                                    </a>
                                )}

                                {canRegeneratePaymentLink() && onRegeneratePaymentLink && (
                                    <button
                                        onClick={() => onRegeneratePaymentLink(order._id)}
                                        className="btn-primary bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                                        disabled={regeneratingPaymentLink}
                                    >
                                        {regeneratingPaymentLink ? 'Regenerating...' : '🔄 Regenerate Payment Link'}
                                    </button>
                                )}

                                {order.paymentToken && (
                                    <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        💳 Payment link sent
                                    </span>
                                )}
                            </>
                        )}

                        {/* Processing order actions */}
                        {order.status === 'processing' && (
                            <>
                                {canDownloadLabel() && (
                                    <a
                                        href={order.shippoShipment!.labelUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary inline-flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                        </svg>
                                        Download Label
                                    </a>
                                )}

                                {canMarkShipped() && onMarkShipped && (
                                    <button
                                        onClick={() => onMarkShipped(order._id)}
                                        className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                        disabled={markingShipped}
                                    >
                                        {markingShipped ? 'Marking Shipped...' : 'Mark as Shipped'}
                                    </button>
                                )}
                            </>
                        )}

                        {/* Shipped and delivered orders */}
                        {['shipped', 'delivered'].includes(order.status) && canDownloadLabel() && (
                            <a
                                href={order.shippoShipment!.labelUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary inline-flex items-center"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                Download Label
                            </a>
                        )}
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex items-center space-x-2">
                        {/* View Details Button */}
                        <Link
                            href={`/admin/orders/${order._id}`}
                            className="btn-secondary inline-flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                        </Link>

                        {/* Email Button */}
                        <button
                            onClick={() => onOpenEmail(order)}
                            className="btn-secondary inline-flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email
                        </button>

                        {/* Shipping Button for all statuses */}
                        <button
                            onClick={() => onOpenShipping(order)}
                            className="btn-secondary inline-flex items-center"
                            disabled={['cancelled', 'rejected'].includes(order.status)}
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Shipping
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Order Details */}
            {expanded && (
                <div className="p-6 border-t border-gray-200">
                    {/* Custom Order Details */}
                    {renderCustomOrderInfo()}

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
                                            <div>Weight: {order.shippingWeight} {order.shippingWeightUnit || 'lbs'}</div>
                                        )}
                                        {order.shippingDimensions && (
                                            <div>
                                                Dimensions: {order.shippingDimensions.length}" × {order.shippingDimensions.width}" × {order.shippingDimensions.height}" {order.shippingDimensions.unit || 'in'}
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

                    {/* Order Items with Custom Item Editing */}
                    <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                        <div className="space-y-3">
                            {order.items.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div className="flex items-center space-x-3">
                                        {item.image && (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-12 h-12 object-cover rounded"
                                            />
                                        )}
                                        <div>
                                            <h5 className="font-medium text-gray-900">{item.name}</h5>
                                            <div className="text-sm text-gray-600">
                                                Qty: {item.quantity} × ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}
                                            </div>
                                            {item.size && <div className="text-xs text-gray-500">Size: {item.size}</div>}
                                            {item.color && <div className="text-xs text-gray-500">Color: {item.color}</div>}

                                            {/* Custom Item Details */}
                                            {item.isCustom && item.customDetails && (
                                                <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                                                    <div className="font-medium text-purple-800">🎨 Custom Item Details:</div>
                                                    {item.customDetails.category && <div>Category: {item.customDetails.category}</div>}
                                                    {item.customDetails.engraving && (
                                                        <div className="text-purple-600">
                                                            Engraving: "{item.customDetails.engraving}"
                                                            {item.customDetails.hasEngraving && (
                                                                <span> (+${item.customDetails.engravingSurcharge || 15})</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {item.customDetails.description && <div>Description: {item.customDetails.description}</div>}
                                                    {item.customDetails.sizes && <div>Sizes: {item.customDetails.sizes}</div>}
                                                    {item.customDetails.notes && <div>Notes: {item.customDetails.notes}</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit Custom Item Button */}
                                    {item.isCustom && onEditCustomItem && ['pending_approval', 'accepted'].includes(order.status) && (
                                        <button
                                            onClick={() => onEditCustomItem(order, index)}
                                            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                        >
                                            Edit Custom Item
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
