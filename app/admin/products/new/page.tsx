'use client'

import { useState } from 'react'
import ProductForm, { ProductFormData } from '@/components/admin/ProductForm'
import EnhancedProductForm, { EnhancedProductFormData } from '@/components/admin/EnhancedProductForm'
import Header from '@/components/Header'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewProductPage() {
  const router = useRouter()
  const [useEnhancedForm, setUseEnhancedForm] = useState(false)

  const handleSimpleSubmit = async (data: ProductFormData) => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create product')
    }

    alert('Product created successfully!')
    router.push('/admin/products')
  }

  const handleEnhancedSubmit = async (data: EnhancedProductFormData) => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create product')
    }

    alert('Product created successfully!')
    router.push('/admin/products')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-5xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link href="/admin/products" className="text-purple-600 hover:text-purple-800 hover:underline text-sm sm:text-base">
            &larr; Back to Products
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">Add New Product</h1>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Form Type:</span>
            <button
              onClick={() => setUseEnhancedForm(false)}
              className={`px-3 py-1 text-sm rounded ${!useEnhancedForm
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Simple
            </button>
            <button
              onClick={() => setUseEnhancedForm(true)}
              className={`px-3 py-1 text-sm rounded ${useEnhancedForm
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Enhanced
            </button>
          </div>
        </div>

        {!useEnhancedForm ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Simple form for basic products with sizes, colors, and single pricing.
            </p>
            <ProductForm onSubmit={handleSimpleSubmit} />
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Enhanced form for products with multiple units/variants, advanced pricing, and individual unit sales.
            </p>
            <EnhancedProductForm onSubmit={handleEnhancedSubmit} />
          </div>
        )}
      </main>
    </div>
  )
}
