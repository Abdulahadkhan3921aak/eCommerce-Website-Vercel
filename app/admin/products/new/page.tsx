'use client'

import ProductForm, { ProductFormData } from '@/components/admin/ProductForm'
import Header from '@/components/Header'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewProductPage() {
  const router = useRouter()

  const handleSubmit = async (data: ProductFormData) => {
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
      <main className="max-w-3xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
            <Link href="/admin/products" className="text-purple-600 hover:text-purple-800 hover:underline text-sm sm:text-base">
                &larr; Back to Products
            </Link>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Add New Product</h1>
        <ProductForm onSubmit={handleSubmit} />
      </main>
    </div>
  )
}
