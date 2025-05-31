'use client'

import { useState } from 'react'
import { useCart } from '@/lib/contexts/CartContext'
import { useAuth } from '@clerk/nextjs'

interface Product {
  _id: string
  name: string
  price: number
  salePrice?: number
  images: string[]
  category: string
}

interface AddToCartButtonProps {
  product: Product
  quantity?: number
  className?: string
  children?: React.ReactNode
}

export default function AddToCartButton({
  product,
  quantity = 1,
  className = 'btn-primary w-full',
  children = 'Add to Cart'
}: AddToCartButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const { addToCart } = useCart()
  const { isSignedIn } = useAuth()

  const handleAddToCart = async () => {
    if (!isSignedIn) {
      alert('Please sign in to add items to cart')
      return
    }

    setIsAdding(true)
    try {
      const cartItem = {
        _id: product._id,
        name: product.name,
        price: product.price,
        salePrice: product.salePrice,
        effectivePrice: product.salePrice || product.price,
        images: product.images,
        category: product.category
      }

      await addToCart(cartItem, quantity)
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding}
      className={`${className} ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isAdding ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Adding...
        </div>
      ) : (
        children
      )}
    </button>
  )
}
