'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/lib/contexts/CartContext'
import Header from "@/components/Header"

interface Product {
  _id: string
  name: string
  description: string
  price: number
  salePrice?: number
  saleConfig?: {
    isOnSale: boolean
    saleType: 'percentage' | 'amount'
    saleValue: number
  }
  images: string[]
  category: string
  sizes?: string[]
  colors?: string[]
  stock: number
  rating: number
  reviews: number
}

interface Props {
  product: Product | null
}

export default function ProductClient({ product }: Props) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const { addToCart } = useCart()

  // Set default selections when product loads
  useState(() => {
    if (product?.sizes?.length) setSelectedSize(product.sizes[0])
    if (product?.colors?.length) setSelectedColor(product.colors[0])
  })

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity, selectedSize, selectedColor)
      alert('Added to cart!')
    }
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <Header />

        {/* Product Not Found */}

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
            <Link href="/products" className="btn-primary">
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 sm:mb-8">
          <ol className="flex items-center space-x-2 text-sm">
            <li><Link href="/" className="text-gray-500 hover:text-purple-600">Home</Link></li>
            <li className="text-gray-400">/</li>
            <li><Link href="/products" className="text-gray-500 hover:text-purple-600">Products</Link></li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium truncate">{product.name}</li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Product Images */}
          <div className="mb-6 lg:mb-0">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 sm:mb-4">
              <Image
                src={product.images[selectedImageIndex] || '/placeholder-image.jpg'}
                alt={product.name}
                width={600}
                height={600}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-gray-100 rounded-md overflow-hidden border-2 ${selectedImageIndex === index ? 'border-purple-600' : 'border-transparent'
                      }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-200'
                        }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">({product.reviews} reviews)</span>
              </div>
            )}

            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">{product.salePrice ? (
              <>
                <span className="text-sm text-gray-500 line-through">${product.price}</span>
                <span className="text-lg sm:text-xl font-bold text-red-600">${product.salePrice}</span>
              </>
            ) : (
              <span className="text-lg sm:text-xl font-bold text-gray-900">${product.price}</span>
            )}</p>

            <div className="mb-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 text-sm sm:text-base">{product.description}</p>
            </div>

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Size</h3>
                <div className="grid grid-cols-4 gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 px-3 text-sm border rounded-md ${selectedSize === size
                        ? 'border-purple-600 bg-purple-50 text-purple-600'
                        : 'border-gray-300 text-gray-700 hover:border-purple-600'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Color</h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`py-2 px-4 text-sm border rounded-md ${selectedColor === color
                        ? 'border-purple-600 bg-purple-50 text-purple-600'
                        : 'border-gray-300 text-gray-700 hover:border-purple-600'
                        }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <label className="block text-base sm:text-lg font-medium text-gray-900 mb-3">
                Quantity
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-600"
                >
                  -
                </button>
                <span className="text-lg sm:text-xl font-medium w-12 text-center text-gray-600">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-600"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={handleAddToCart}
                className="w-full btn-primary text-base sm:text-lg py-3"
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <Link href="/cart" className="flex-1 btn-secondary text-center py-3">
                  View Cart
                </Link>
                <Link href="/checkout" className="flex-1 btn-primary text-center py-3">
                  Buy Now
                </Link>
              </div>
            </div>

            {/* Stock Info */}
            <div className="mt-6 text-sm text-gray-600">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
