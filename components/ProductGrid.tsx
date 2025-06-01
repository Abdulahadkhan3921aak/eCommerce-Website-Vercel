'use client'

import Image from 'next/image'
import Link from 'next/link'

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
  rating: number
  reviews: number
}

interface ProductGridProps {
  products: Product[]
}

export default function ProductGrid({ products }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No products found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <Link href={`/products/${product._id}`}>
            <div className="relative h-48 sm:h-64">
              <Image
                src={product.images[0] || '/placeholder-image.jpg'}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg sm:text-xl font-bold text-blue-600">{product.salePrice ? (
                  <>
                    <span className="text-sm text-gray-500 line-through">${product.price}</span>
                    <span className="text-lg sm:text-xl font-bold text-red-600">${product.salePrice}</span>
                  </>
                ) : (
                  <span className="text-lg sm:text-xl font-bold text-gray-900">${product.price}</span>
                )} </span>
                <div className="flex items-center">
                  <span className="text-yellow-400">★</span>
                  <span className="text-xs sm:text-sm text-gray-600 ml-1">{product.rating} ({product.reviews})</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  )
}
