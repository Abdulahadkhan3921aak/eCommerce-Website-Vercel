'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Redirect to the new payment success page
    const sessionId = searchParams.get('session_id')
    const orderId = searchParams.get('order_id')
    const paymentIntent = searchParams.get('payment_intent')

    if (sessionId && orderId) {
      const params = new URLSearchParams({
        session_id: sessionId,
        order_id: orderId,
        ...(paymentIntent && { payment_intent: paymentIntent })
      })

      router.replace(`/payment/success?${params.toString()}`)
    } else {
      router.replace('/cart')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Redirecting to payment confirmation...</p>
      </div>
    </div>
  )
}
