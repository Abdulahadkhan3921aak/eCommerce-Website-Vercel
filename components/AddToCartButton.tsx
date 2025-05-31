'use client'

import { useState } from 'react'
import { useCart } from '@/lib/contexts/CartContext'

interface AddToCartButtonProps {
  product: any
  quantity?: number
  size?: string
  color?: string
  className?: string
  disabled?: boolean
}

export default function AddToCartButton({
  product,
  quantity = 1,
  size,
  color,
  className = '',
  disabled = false
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart } = useCart()

  const handleAddToCart = async () => {
    if (disabled || !product) return
    
    setIsAdding(true)
    try {
      addToCart(product, quantity, size, color)
      // You could add a toast notification here
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={`btn-primary ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isAdding ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Adding...
        </div>
      ) : (
        'Add to Cart'
      )}
    </button>
  )
}
