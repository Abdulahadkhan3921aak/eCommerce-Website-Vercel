'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/lib/contexts/CartContext'
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import Header from "@/components/Header"

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getTotalPrice, getTotalItems, isLoading } = useCart()
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Your cart is empty!')
      return
    }

    setIsCheckoutLoading(true)
    try {
      // Format items for Stripe
      const stripeItems = items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.images.length > 0 ? [item.images[0]] : [],
            description: `Quantity: ${item.quantity}`,
          },
          unit_amount: Math.round(item.effectivePrice * 100),
        },
        quantity: item.quantity,
      }))

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: stripeItems,
          cartItems: items,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed')
      }

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(`Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  const subtotal = getTotalPrice()
  const shipping = subtotal >= 100 ? 0 : 9.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading your cart...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h8a2 2 0 002-2v-6M7 13H5a2 2 0 00-2 2v4a2 2 0 002 2h2" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Your cart is empty</h3>
            <p className="mt-1 text-gray-600">Start adding some items to your cart!</p>
            <Link href="/products" className="mt-4 sm:mt-6 btn-primary inline-block">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
            {/* Cart Items */}
            <div className="lg:col-span-8">
              <div className="space-y-4 sm:space-y-6">
                {items.map((item, index) => (
                  <div key={`${item._id}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                      <img
                        src={item.images[0] || '/placeholder-image.jpg'}
                        alt={item.name}
                        width="96"
                        height="96"
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>

                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900">{item.name}</h3>
                      <div className="mt-1 flex flex-wrap text-sm text-gray-600 gap-x-4">
                        <span className="font-medium">Category: {item.category}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {item.salePrice ? (
                          <>
                            <span className="text-sm text-gray-500 line-through">${item.price.toFixed(2)}</span>
                            <span className="text-base sm:text-lg font-bold text-red-600">${item.salePrice.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-base sm:text-lg font-bold text-gray-900">${item.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end space-y-2 sm:space-y-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-700 font-medium"
                          disabled={item.quantity <= 1 || isLoading}
                        >
                          -
                        </button>
                        <span className="text-base sm:text-lg font-bold text-gray-900 w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-700 font-medium"
                          disabled={isLoading}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                          ${(item.effectivePrice * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="mt-1 sm:mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4 mt-6 lg:mt-0">
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Order Summary</h2>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between text-gray-700">
                    <span className="text-sm sm:text-base">Subtotal ({getTotalItems()} items)</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="text-sm sm:text-base">Shipping</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span className="text-sm sm:text-base">Tax</span>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3 sm:pt-4">
                    <div className="flex justify-between text-lg sm:text-xl">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-gray-900">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <SignedIn>
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckoutLoading || items.length === 0 || isLoading}
                    className="w-full mt-4 sm:mt-6 btn-primary py-3 text-base sm:text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckoutLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </button>
                </SignedIn>

                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="w-full mt-4 sm:mt-6 btn-primary py-3 text-base sm:text-lg font-semibold">
                      Sign In to Checkout
                    </button>
                  </SignInButton>
                </SignedOut>

                <Link href="/products" className="w-full mt-3 btn-secondary text-center block py-3 font-medium text-sm sm:text-base">
                  Continue Shopping
                </Link>

                {subtotal >= 100 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs sm:text-sm text-green-800 font-medium">
                      🎉 You qualify for free shipping!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
