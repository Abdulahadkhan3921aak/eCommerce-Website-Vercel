'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Product, getProductPriceRange, hasAnySale } from '@/lib/types/product'

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
      {products.map((product) => {
        // Calculate total stock from units
        const totalStock = product.units && product.units.length > 0
          ? product.units.reduce((sum, unit) => sum + (unit.stock || 0), 0)
          : (product.totalStock || product.stock || 0);

        const isOutOfStock = totalStock === 0;
        const lowStock = totalStock <= 5 && totalStock > 0;
        const priceRange = getProductPriceRange(product);
        const hasVariedPricing = priceRange.min !== priceRange.max;
        const productOnSale = hasAnySale(product);

        return (
          <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <Link href={`/products/${product._id}`}>
              <div className="relative h-48 sm:h-64">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Out of Stock</span>
                  </div>
                )}
                {lowStock && !isOutOfStock && (
                  <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                    Low Stock
                  </div>
                )}
                {productOnSale && !isOutOfStock && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Sale
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-lg sm:text-xl font-bold">
                    {hasVariedPricing ? (
                      <span className="text-gray-900">
                        ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)}
                      </span>
                    ) : productOnSale ? (
                      <>
                        <span className="text-sm text-gray-500 line-through">${product.price.toFixed(2)}</span>
                        <span className="text-red-600 ml-1">${priceRange.min.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-gray-900">${priceRange.min.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-yellow-400">★</span>
                    <span className="text-xs sm:text-sm text-gray-600 ml-1">{product.rating} ({product.reviews})</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Stock: {totalStock} available
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
