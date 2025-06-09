'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { Product } from '@/models/Product'
import EnhancedProductForm, { EnhancedProductFormData } from '@/components/admin/EnhancedProductForm'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params

  const [product, setProduct] = useState<EnhancedProductFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          setLoading(true)
          const response = await fetch(`/api/products/${id}`)
          if (!response.ok) {
            throw new Error('Failed to fetch product data')
          }
          const data = await response.json()

          // Transform the data to match our enhanced form structure
          const transformedData: EnhancedProductFormData = {
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            price: data.price || 0,
            stock: data.stock || 0,
            images: data.images || [],
            units: data.units || [],
            saleConfig: data.saleConfig || {
              isOnSale: false,
              saleType: 'percentage',
              saleValue: 0
            }
          }

          setProduct(transformedData)
        } catch (err: any) {
          setError(err.message)
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      fetchProduct()
    }
  }, [id])

  const handleSubmit = async (data: EnhancedProductFormData) => {
    if (!id) return

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update product')
      }

      alert('Product updated successfully!')
      router.push('/admin/products')
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="ml-4 text-gray-600">Loading product details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-3xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-red-500 p-4 bg-red-100 rounded text-sm">Error: {error}</div>
          <div className="mt-4">
            <Link href="/admin/products" className="text-purple-600 hover:text-purple-800 hover:underline text-sm sm:text-base">
              &larr; Back to Products
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="max-w-5xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <p>Product not found.</p>
          <div className="mt-4">
            <Link href="/admin/products" className="text-purple-600 hover:text-purple-800 hover:underline text-sm sm:text-base">
              &larr; Back to Products
            </Link>
          </div>
        </main>
      </div>
    )
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
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Edit Product</h1>
        <EnhancedProductForm initialData={product} onSubmit={handleSubmit} isEditing={true} />
      </main>
    </div>
  )
}
