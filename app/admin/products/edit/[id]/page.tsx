'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import EnhancedProductForm, { EnhancedProductFormData } from '@/components/admin/EnhancedProductForm'
import { usePopup } from '@/lib/contexts/PopupContext'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { showAlert } = usePopup()

  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null

  const [product, setProduct] = useState<EnhancedProductFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id && id !== 'undefined' && id !== 'null') {
      const fetchProduct = async () => {
        try {
          setLoading(true)
          setError(null)

          const response = await fetch(`/api/products/${id}`)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch product`)
          }

          const data = await response.json()

          // Transform the data to match our form structure
          const transformedData: EnhancedProductFormData = {
            _id: data._id,
            name: data.name || '',
            description: data.description || '',
            category: data.category || 'ring',
            colors: data.colors || [],
            sizes: data.sizes || [],
            units: data.units || [],
            saleConfig: data.saleConfig || {
              isOnSale: false,
              saleType: 'percentage',
              saleValue: 0
            },
            tax: data.tax || 0,
            featured: data.featured || false,
            slug: data.slug || ''
          }

          setProduct(transformedData)
        } catch (err: any) {
          console.error('Error fetching product:', err)
          setError(err.message || 'Failed to fetch product')
        } finally {
          setLoading(false)
        }
      }
      fetchProduct()
    } else {
      setError('Invalid product ID')
      setLoading(false)
    }
  }, [id])

  const handleSubmit = async (data: EnhancedProductFormData) => {
    if (!id || id === 'undefined' || id === 'null') {
      showAlert('Error: Invalid product ID', 'error')
      return
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Failed to update product`)
      }

      showAlert('Product updated successfully!', 'success')
      router.push('/admin/products')
    } catch (error: any) {
      console.error('Error updating product:', error)
      showAlert(`Error updating product: ${error.message}`, 'error')
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
          <p>Product not found or invalid ID: {id}</p>
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
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">
          Edit Product: {product.name}
        </h1>
        <EnhancedProductForm
          initialData={product}
          onSubmit={handleSubmit}
          isEditing={true}
        />
      </main>
    </div>
  )
}
