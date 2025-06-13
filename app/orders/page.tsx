'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface OrderItem {
  name: string
  price: number
  quantity: number
  size?: string
  color?: string
  unitId?: string
  image: string
  isCustom?: boolean // Add custom order indicator
  customDetails?: {
    category: string
    engraving?: string
    notes?: string
  }
}

interface Order {
  _id: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  trackingNumber?: string
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

export default function OrdersPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add route protection
  useEffect(() => {
    if (isLoaded && !user) {
      // Redirect non-signed-in users to sign-in page
      router.push('/sign-in')
      return
    }
  }, [isLoaded, user, router])

  // Add user role check
  useEffect(() => {
    const checkUserRole = async () => {
      if (!isLoaded || !user) return

      try {
        const response = await fetch('/api/admin/current-user')
        if (response.ok) {
          const data = await response.json()
          const userRole = data.role

          // Redirect admin/owner users away from orders page
          if (userRole === 'admin' || userRole === 'owner') {
            router.push('/admin')
            return
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error)
      }
    }

    checkUserRole()
  }, [isLoaded, user, router])

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isLoaded || !user) return

      try {
        const response = await fetch('/api/orders')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch orders')
        }

        setOrders(data.orders)
      } catch (error) {
        console.error('Error fetching orders:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [user, isLoaded])

  const renderCustomOrderDetails = (order: Order) => {
    if (!order.isCustomOrder || !order.customOrderDetails) return null

    return (
      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="font-semibold text-purple-800 mb-2">🎨 Custom Order Details</h4>
        <div className="space-y-2 text-sm text-purple-700">
          <div><strong>Category:</strong> {order.customOrderDetails.category}</div>
          <div><strong>Title:</strong> {order.customOrderDetails.title}</div>
          <div><strong>Sizes:</strong> {renderSizeSVG(order.customOrderDetails.category, order.customOrderDetails.sizes)}</div>
          {order.customOrderDetails.engraving && (
            <div><strong>Engraving:</strong> {order.customOrderDetails.engraving}</div>
          )}
          {order.customOrderDetails.description && (
            <div><strong>Description:</strong> {order.customOrderDetails.description}</div>
          )}
          {order.customOrderDetails.notes && (
            <div><strong>Special Notes:</strong> {order.customOrderDetails.notes}</div>
          )}
        </div>
      </div>
    )
  }

  const renderSizeSVG = (category: string, sizes: string) => {
    return (
      <div className="flex items-center space-x-2">
        <span>{sizes}</span>
        {getSizeSVG(category, sizes)}
      </div>
    )
  }

  const getSizeSVG = (category: string, sizes: string) => {
    const sizeArray = sizes.split(',').map(s => s.trim())

    switch (category.toLowerCase()) {
      case 'ring':
        return (
          <div className="flex space-x-1">
            {sizeArray.map((size, index) => (
              <svg key={index} width="24" height="24" viewBox="0 0 24 24" className="text-purple-600">
                <circle
                  cx="12"
                  cy="12"
                  r={getCircleRadius(size)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <text x="12" y="16" textAnchor="middle" fontSize="8" fill="currentColor">
                  {size}
                </text>
              </svg>
            ))}
          </div>
        )

      case 'bracelet':
        return (
          <div className="flex space-x-1">
            {sizeArray.map((size, index) => (
              <svg key={index} width="32" height="20" viewBox="0 0 32 20" className="text-purple-600">
                <ellipse
                  cx="16"
                  cy="10"
                  rx={getBraceletWidth(size)}
                  ry="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <text x="16" y="14" textAnchor="middle" fontSize="8" fill="currentColor">
                  {size}
                </text>
              </svg>
            ))}
          </div>
        )

      case 'necklace':
        return (
          <div className="flex space-x-1">
            {sizeArray.map((size, index) => (
              <svg key={index} width="24" height="32" viewBox="0 0 24 32" className="text-purple-600">
                <path
                  d={getNecklacePath(size)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <text x="12" y="28" textAnchor="middle" fontSize="8" fill="currentColor">
                  {size}"
                </text>
              </svg>
            ))}
          </div>
        )

      case 'earring':
        return (
          <div className="flex space-x-1">
            {sizeArray.map((size, index) => (
              <svg key={index} width="16" height="24" viewBox="0 0 16 24" className="text-purple-600">
                <circle
                  cx="8"
                  cy="6"
                  r="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="8"
                  y1="10"
                  x2="8"
                  y2={10 + getEarringLength(size)}
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <text x="8" y="22" textAnchor="middle" fontSize="8" fill="currentColor">
                  {size}
                </text>
              </svg>
            ))}
          </div>
        )

      default:
        return <span className="text-xs text-gray-500">({sizes})</span>
    }
  }

  // Helper functions for SVG sizing
  const getCircleRadius = (size: string) => {
    const numSize = parseFloat(size)
    return Math.max(4, Math.min(10, numSize / 2 + 3)) // Scale ring size to radius
  }

  const getBraceletWidth = (size: string) => {
    const sizeMap: { [key: string]: number } = {
      'XS': 10, 'S': 12, 'M': 14, 'L': 16, 'XL': 18
    }
    return sizeMap[size.toUpperCase()] || 14
  }

  const getNecklacePath = (size: string) => {
    const length = parseFloat(size) || 16
    const curve = Math.max(8, length / 3)
    return `M 4 4 Q 12 ${curve} 20 4 Q 12 ${curve + 4} 4 4`
  }

  const getEarringLength = (size: string) => {
    const sizeMap: { [key: string]: number } = {
      'XS': 4, 'S': 6, 'M': 8, 'L': 10, 'XL': 12
    }
    return sizeMap[size.toUpperCase()] || 8
  }

  // Show loading state while checking authentication and role
  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Orders</h1>
            <p className="text-red-600 mb-8">{error}</p>
            <Link href="/products" className="btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'processing': return 'bg-purple-100 text-purple-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'pending_payment': return 'bg-orange-100 text-orange-800'
      case 'pending_payment_adjustment': return 'bg-orange-100 text-orange-800'
      case 'removed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'accepted':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'rejected':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      case 'shipped':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )
      case 'delivered':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'cancelled':
      case 'removed':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'pending_payment':
      case 'pending_payment_adjustment':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getStatusMessage = (order: Order) => {
    switch (order.status) {
      case 'pending_approval':
        return 'Your order is awaiting review by our team. We\'ll notify you once it\'s processed.'
      case 'accepted':
        return 'Great news! Your order has been accepted and is being prepared.'
      case 'rejected':
        return order.adminApproval?.rejectionReason || 'Unfortunately, your order was rejected. Please contact us for more information.'
      case 'processing':
        return 'Your order is being prepared and will ship soon.'
      case 'shipped':
        return order.trackingNumber
          ? `Your order has shipped! Track it with: ${order.trackingNumber}`
          : 'Your order has shipped and is on its way to you.'
      case 'delivered':
        return 'Your order has been delivered. We hope you love it!'
      case 'cancelled':
        return 'This order was cancelled.'
      case 'removed':
        return 'This order was removed from our system.'
      case 'pending_payment':
        return 'Payment is required to complete your order. Check your email for payment instructions.'
      case 'pending_payment_adjustment':
        return 'Your order total has been adjusted. A new payment link will be sent to you.'
      default:
        return 'Order status is being updated.'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Orders</h1>

        {/* Custom Orders Notice */}
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-purple-800">Custom Orders</h3>
              <p className="text-purple-700 text-sm">Custom orders require manual review and will show special pricing after admin approval.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
            <p className="mt-1 text-sm text-gray-500">Start shopping to see your orders here!</p>
            <div className="mt-6 space-x-4">
              <Link href="/products" className="btn-primary">
                Browse Products
              </Link>
              <Link href="/custom" className="btn-secondary">
                Create Custom Order
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                {/* Order Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order._id.slice(-8)}
                        </h3>
                        {order.isCustomOrder && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🎨 Custom Order
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </p>

                      {/* Status Message */}
                      <div className="mt-2">
                        <p className={`text-sm ${order.status === 'rejected' ? 'text-red-600' :
                          order.status === 'delivered' ? 'text-green-600' :
                            order.status === 'cancelled' || order.status === 'removed' ? 'text-gray-600' :
                              'text-blue-600'}`}>
                          {getStatusMessage(order)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Show rejection details if order was rejected */}
                {order.status === 'rejected' && order.adminApproval?.rejectionReason && (
                  <div className="px-6 py-3 bg-red-50 border-b border-red-200">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-red-800">Order Rejection Details</h4>
                        <p className="text-sm text-red-700 mt-1">{order.adminApproval.rejectionReason}</p>
                        <p className="text-xs text-red-600 mt-2">
                          Need help? <Link href="/contact" className="underline hover:text-red-800">Contact our support team</Link>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show removed notice if order was removed */}
                {order.status === 'removed' && (
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-gray-800">Order Status</h4>
                        <p className="text-sm text-gray-700 mt-1">This order has been removed from our system.</p>
                        <p className="text-xs text-gray-600 mt-2">
                          Questions? <Link href="/contact" className="underline hover:text-gray-800">Contact our support team</Link>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                            <span>Qty: {item.quantity}</span>
                            {item.size && <span>Size: {item.size}</span>}
                            {item.color && <span>Color: {item.color}</span>}
                            {item.isCustom && (
                              <span className="text-purple-600 font-medium">Custom Item</span>
                            )}
                          </div>
                          {item.customDetails && (
                            <div className="mt-1 text-xs text-purple-600">
                              {item.customDetails.category} - {item.customDetails.engraving && `Engraved: ${item.customDetails.engraving}`}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom Order Details */}
                  {renderCustomOrderDetails(order)}

                  {/* Tracking Information */}
                  {order.trackingNumber && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-green-800">Package Shipped</p>
                          <p className="text-sm text-green-600">Tracking: {order.trackingNumber}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
