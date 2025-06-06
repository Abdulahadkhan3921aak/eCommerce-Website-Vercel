'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useCart } from '@/lib/contexts/CartContext'

interface OrderDetails {
  _id: string
  items: Array<{
    name: string
    price: number
    quantity: number
    size?: string
    color?: string
  }>
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  status: string
  paymentStatus: string
  createdAt: string
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const { clearCart } = useCart()
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !orderId) {
        setError('Missing payment or order information')
        setLoading(false)
        return
      }

      try {
        // Verify the payment and get order details
        const response = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            orderId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify payment')
        }

        setOrderDetails(data.order)
        
        // Clear the cart after successful order
        clearCart()
      } catch (error) {
        console.error('Error verifying payment:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId, orderId, clearCart])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Verifying your payment...</p>
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
            <div className="mt-6">
              <Link href="/cart" className="btn-primary">
                Return to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Payment Successful!</h3>
          <p className="mt-2 text-sm text-gray-600">
            Thank you for your order. You'll receive an email confirmation shortly.
          </p>
        </div>

        {orderDetails && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Order Details</h4>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Order ID: <span className="font-mono text-gray-900">{orderDetails._id}</span></p>
              <p className="text-sm text-gray-600">Order Date: {new Date(orderDetails.createdAt).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">Status: <span className="capitalize font-medium">{orderDetails.status}</span></p>
            </div>

            <div className="space-y-3">
              {orderDetails.items.map((item, index) => (
                <div key={index} className="flex justify-between py-2 border-b border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <div className="text-sm text-gray-600">
                      {item.size && <span>Size: {item.size} </span>}
                      {item.color && <span>Color: {item.color} </span>}
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${orderDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span>{orderDetails.shippingCost === 0 ? 'Free' : `$${orderDetails.shippingCost.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span>${orderDetails.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 mt-2 pt-2 border-t border-gray-300">
                <span>Total</span>
                <span>${orderDetails.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/products" className="btn-primary text-center">
            Continue Shopping
          </Link>
          <Link href="/orders" className="btn-secondary text-center">
            View Order History
          </Link>
        </div>
      </div>
    </div>
  )
}
