'use client'

import React from 'react'
import { useCart } from '@/lib/contexts/CartContext'

export default function CartNotification() {
    const { notification, clearNotification } = useCart()

    if (!notification.show) return null

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-2 duration-300">
            <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm max-w-sm
        ${notification.type === 'success'
                    ? 'bg-green-50/95 border-green-200 text-green-800'
                    : 'bg-red-50/95 border-red-200 text-red-800'
                }
      `}>
                {notification.type === 'success' ? (
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}

                <span className="font-medium text-sm">{notification.message}</span>

                <button
                    onClick={clearNotification}
                    className="ml-auto hover:opacity-70 transition-opacity flex-shrink-0"
                    aria-label="Close notification"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    )
}