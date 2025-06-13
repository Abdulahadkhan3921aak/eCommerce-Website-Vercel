'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { usePopup } from '@/lib/contexts/PopupContext'
import OrderCard from '@/components/admin/OrderCard'
import ShippingModal from '@/components/admin/ShippingModal'
import EmailModal from '@/components/admin/EmailModal'

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
    shippingWeight?: number
    shippingDimensions?: {
        length: number
        width: number
        height: number
        unit?: 'in' | 'cm';
    }
    shippingWeightUnit?: 'lb' | 'kg';
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
    paymentTokenExpiry?: string
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
    const [showShippingModal, setShowShippingModal] = useState(false)
    const [selectedOrderForShipping, setSelectedOrderForShipping] = useState<Order | null>(null)
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
    const [generatingPaymentLink, setGeneratingPaymentLink] = useState<string | null>(null)
    const [regeneratingPaymentLink, setRegeneratingPaymentLink] = useState<string | null>(null)
    const [markingShipped, setMarkingShipped] = useState<string | null>(null)
    const [editingCustomItem, setEditingCustomItem] = useState<{ orderId: string, itemIndex: number } | null>(null)
    const [customItemForm, setCustomItemForm] = useState({
        name: '',
        price: 0,
        quantity: 1,
        customDetails: {}
    })

    const { showAlert } = usePopup()

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

    const handleAcceptOrder = async (orderId: string) => {
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ adminNotes: '' })
            })
            const data = await response.json()
            if (response.ok) {
                showAlert('Order accepted and email sent!', 'success')
                fetchOrders()
            } else {
                showAlert(data.error || 'Failed to accept order', 'error')
            }
        } catch (error) {
            console.error('Error accepting order:', error)
            showAlert('An error occurred while accepting the order', 'error')
        }
    }

    const handleRejectOrder = async (orderId: string) => {
        const reason = prompt('Please provide a reason for rejection:')
        if (!reason) return

        try {
            const response = await fetch(`/api/admin/orders/${orderId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            })
            const data = await response.json()
            if (response.ok) {
                showAlert('Order rejected!', 'success')
                fetchOrders()
            } else {
                showAlert(data.error || 'Failed to reject order', 'error')
            }
        } catch (error) {
            console.error('Error rejecting order:', error)
            showAlert('An error occurred while rejecting the order', 'error')
        }
    }

    const handleRemoveOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to remove this order? This action cannot be undone.')) {
            return
        }

        try {
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'DELETE',
            })
            const data = await response.json()
            if (response.ok) {
                showAlert('Order removed successfully!', 'success')
                fetchOrders()
            } else {
                showAlert(data.error || 'Failed to remove order', 'error')
            }
        } catch (error) {
            console.error('Error removing order:', error)
            showAlert('An error occurred while removing the order', 'error')
        }
    }

    const handleGeneratePaymentLink = async (orderId: string) => {
        setGeneratingPaymentLink(orderId)
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/generate-payment-link`, {
                method: 'POST',
            })
            const data = await response.json()
            if (response.ok) {
                showAlert(data.message || 'Payment link generated and sent successfully!', 'success')
                fetchOrders()
            } else {
                showAlert(data.error || 'Failed to generate payment link.', 'error')
            }
        } catch (error) {
            console.error('Error generating payment link:', error)
            showAlert('An error occurred while generating payment link.', 'error')
        } finally {
            setGeneratingPaymentLink(null)
        }
    }

    const handleRegeneratePaymentLink = async (orderId: string) => {
        setRegeneratingPaymentLink(orderId)
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/generate-payment-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ regenerate: true })
            })
            const data = await response.json()
            if (response.ok) {
                showAlert(data.message || 'Payment link regenerated and sent successfully!', 'success')
                fetchOrders()
            } else {
                showAlert(data.error || 'Failed to regenerate payment link.', 'error')
            }
        } catch (error) {
            console.error('Error regenerating payment link:', error)
            showAlert('An error occurred while regenerating payment link.', 'error')
        } finally {
            setRegeneratingPaymentLink(null)
        }
    }

    const handleMarkShipped = async (orderId: string) => {
        setMarkingShipped(orderId)
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/mark-shipped`, {
                method: 'POST',
            })
            const data = await response.json()
            if (response.ok) {
                showAlert(data.message || 'Order marked as shipped and customer notified!', 'success')
                fetchOrders()
            } else {
                showAlert(data.error || 'Failed to mark order as shipped.', 'error')
            }
        } catch (error) {
            console.error('Error marking order as shipped:', error)
            showAlert('An error occurred while marking order as shipped.', 'error')
        } finally {
            setMarkingShipped(null)
        }
    }

    const toggleOrderExpanded = (orderId: string) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev)
            if (newSet.has(orderId)) {
                newSet.delete(orderId)
            } else {
                newSet.add(orderId)
            }
            return newSet
        })
    }

    const handleOpenShippingModal = (order: Order) => {
        setSelectedOrderForShipping(order)
        setShowShippingModal(true)
    }

    const handleOpenEmailModal = (order: Order) => {
        setSelectedOrder(order)
        setShowEmailModal(true)
    }

    const handleEditCustomItem = (order: Order, itemIndex: number) => {
        const item = order.items[itemIndex]
        setCustomItemForm({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            customDetails: item.customDetails || {}
        })
        setEditingCustomItem({ orderId: order._id, itemIndex })
    }

    const handleSaveCustomItem = async () => {
        if (!editingCustomItem) return

        try {
            const response = await fetch(`/api/admin/orders/${editingCustomItem.orderId}/edit-custom-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemIndex: editingCustomItem.itemIndex,
                    updatedItem: customItemForm
                })
            })

            const data = await response.json()
            if (response.ok) {
                showAlert('Custom item updated successfully!', 'success')
                fetchOrders() // Refresh orders
                setEditingCustomItem(null)
            } else {
                showAlert(data.error || 'Failed to update custom item', 'error')
            }
        } catch (error) {
            console.error('Error updating custom item:', error)
            showAlert('Error updating custom item', 'error')
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
                            <OrderCard
                                key={order._id}
                                order={order}
                                expanded={expandedOrders.has(order._id)}
                                onToggleExpand={() => toggleOrderExpanded(order._id)}
                                onAccept={handleAcceptOrder}
                                onReject={handleRejectOrder}
                                onRemove={handleRemoveOrder}
                                onOpenShipping={handleOpenShippingModal}
                                onOpenEmail={handleOpenEmailModal}
                                onGeneratePaymentLink={handleGeneratePaymentLink}
                                onRegeneratePaymentLink={handleRegeneratePaymentLink}
                                onMarkShipped={handleMarkShipped}
                                onEditCustomItem={handleEditCustomItem}
                                generatingPaymentLink={generatingPaymentLink === order._id}
                                regeneratingPaymentLink={regeneratingPaymentLink === order._id}
                                markingShipped={markingShipped === order._id}
                            />
                        ))}
                    </div>
                )}

                {/* Email Modal */}
                {showEmailModal && selectedOrder && (
                    <EmailModal
                        order={selectedOrder}
                        isOpen={showEmailModal}
                        onClose={() => {
                            setShowEmailModal(false)
                            setSelectedOrder(null)
                        }}
                    />
                )}

                {/* Shipping Modal */}
                {showShippingModal && selectedOrderForShipping && (
                    <ShippingModal
                        order={selectedOrderForShipping}
                        isOpen={showShippingModal}
                        onClose={() => {
                            setShowShippingModal(false)
                            setSelectedOrderForShipping(null)
                        }}
                        onOrderUpdate={fetchOrders}
                    />
                )}
            </div>
        </div>
    )
}
