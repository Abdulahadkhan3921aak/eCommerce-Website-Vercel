'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { Product } from '@/models/Product'
import EnhancedProductForm, { EnhancedProductFormData } from '@/components/admin/EnhancedProductForm'
import { usePopup } from '@/lib/contexts/PopupContext'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { showAlert } = usePopup()

  // Extract id properly from params with better type safety
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null

  const [product, setProduct] = useState<EnhancedProductFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Params received:', params) // Debug log
    console.log('Extracted ID:', id) // Debug log

    if (id && id !== 'undefined' && id !== 'null') {
      const fetchProduct = async () => {
        try {
          setLoading(true)
          setError(null)
          console.log('Fetching product with ID:', id) // Debug log

          const response = await fetch(`/api/products/${id}`)
          console.log('Response status:', response.status) // Debug log

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch product`)
          }

          const data = await response.json()
          console.log('Product data received:', data) // Debug log

          // Transform the data to match our enhanced form structure
          const transformedData: EnhancedProductFormData = {
            _id: data._id,
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

          console.log('Transformed data:', transformedData) // Debug log
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
      console.error('Invalid product ID:', id, 'from params:', params)
      setError('Invalid product ID')
      setLoading(false)
    }
  }, [id, params])

  const handleSubmit = async (data: EnhancedProductFormData) => {
    if (!id || id === 'undefined' || id === 'null') {
      console.error('No valid product ID available for update. ID:', id)
      showAlert('Error: Invalid product ID', 'error')
      return
    }

    try {
      console.log('Updating product with ID:', id) // Debug log
      console.log('Update data:', data) // Debug log

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      console.log('Update response status:', response.status) // Debug log

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Update error response:', errorData)
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Failed to update product`)
      }

      const result = await response.json()
      console.log('Update successful:', result)

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
