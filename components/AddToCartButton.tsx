'use client'

import { useState } from 'react'
import { useCart } from '@/lib/contexts/CartContext'
import { useAuth } from '@clerk/nextjs'
import { Product } from '@/models/Product'

interface AddToCartButtonProps {
  product: Product
  selectedUnit?: {
    unitId: string
    size?: string
    color?: string
    stock: number
    price: number
    salePrice?: number
    images?: string[]
  }
  quantity?: number
  className?: string
  children?: React.ReactNode
}

export default function AddToCartButton({
  product,
  selectedUnit,
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

    // Validate product data before proceeding
    if (!product) {
      console.error('AddToCartButton: Product is null or undefined')
      return
    }

    if (!product._id) {
      console.error('AddToCartButton: Product missing _id', product)
      return
    }

    if (!product.name) {
      console.error('AddToCartButton: Product missing name', product)
      return
    }

    if (typeof product.price !== 'number' || product.price < 0) {
      console.error('AddToCartButton: Invalid product price', product.price)
      return
    }

    if (!Array.isArray(product.images)) {
      console.error('AddToCartButton: Product images should be an array', product.images)
      return
    }

    setIsAdding(true)
    try {
      if (selectedUnit) {
        // Validate selectedUnit data
        if (!selectedUnit.unitId) {
          console.error('AddToCartButton: Selected unit missing unitId')
          return
        }

        // The cart context will handle the effective price calculation
        // Just pass the product and unit info
        addToCart(product, quantity, selectedUnit.size, selectedUnit.color, selectedUnit.unitId)
      } else if (product.units && Array.isArray(product.units) && product.units.length > 0) {
        // Find the first available unit
        const availableUnit = product.units.find(unit =>
          unit &&
          typeof unit.stock === 'number' &&
          unit.stock > 0 &&
          unit.unitId
        )

        if (availableUnit) {
          addToCart(product, quantity, availableUnit.size, availableUnit.color, availableUnit.unitId)
        } else {
          console.warn('AddToCartButton: No available units found')
          alert('Product is out of stock')
        }
      } else {
        // Legacy product without units - use consistent ID format
        addToCart(product, quantity, undefined, undefined, undefined)
      }
    } catch (error) {
      console.error('AddToCartButton: Error in handleAddToCart:', error)
      console.error('Product data:', product)
      console.error('Selected unit:', selectedUnit)
      console.error('Quantity:', quantity)
    } finally {
      setIsAdding(false)
    }
  }

  const isOutOfStock = selectedUnit
    ? (typeof selectedUnit.stock === 'number' && selectedUnit.stock === 0)
    : (product.units && Array.isArray(product.units) && product.units.length > 0)
      ? product.units.every(unit => typeof unit.stock === 'number' && unit.stock === 0)
      : (typeof (product.totalStock || product.stock) === 'number' && (product.totalStock || product.stock) === 0)

  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding || isOutOfStock}
      className={`${className} ${isAdding || isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isAdding ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Adding...
        </div>
      ) : isOutOfStock ? (
        'Out of Stock'
      ) : (
        children
      )}
    </button>
  )
}
