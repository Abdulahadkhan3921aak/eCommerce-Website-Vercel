'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export interface ProductFormData {
  _id?: string
  name: string
  description: string
  price: number
  salePrice?: number // Added salePrice
  images: string[] // Array of image URLs
  category: string
  sizes: string[]
  colors: string[]
  stock: number
  featured: boolean
  slug: string
}

interface ProductFormProps {
  initialData?: ProductFormData
  onSubmit: (data: ProductFormData) => Promise<void>
  isEditing?: boolean
}

export default function ProductForm({ initialData, onSubmit, isEditing = false }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    salePrice: undefined, // Initialize salePrice
    images: [''], // Start with one empty image URL field
    category: '',
    sizes: [],
    colors: [],
    stock: 0,
    featured: false,
    slug: '',
    ...initialData,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        images: initialData.images.length > 0 ? initialData.images : [''], // Ensure at least one image field
        sizes: initialData.sizes || [],
        colors: initialData.colors || [],
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    if (name === 'name' && !isEditing) { // Auto-generate slug only when creating and name changes
        setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') }))
    }
  }

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'sizes' | 'colors') => {
    setFormData(prev => ({ ...prev, [field]: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))
  }
  
  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData(prev => ({ ...prev, images: newImages }))
  }

  const addImageField = () => {
    setFormData(prev => ({ ...prev, images: [...prev.images, ''] }))
  }

  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, images: newImages }))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const dataToSubmit = {
        ...formData,
        images: formData.images.filter(img => img.trim() !== '') // Filter out empty image strings
      };
      await onSubmit(dataToSubmit)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 shadow sm:rounded-lg">
      {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded">{error}</div>}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"/>
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Slug</label>
        <input type="text" name="slug" id="slug" value={formData.slug} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 bg-gray-50" readOnly={isEditing} />
        {!isEditing && <p className="mt-1 text-xs text-gray-500">Auto-generated from name. Can be manually adjusted.</p>}
         {isEditing && <p className="mt-1 text-xs text-gray-500">Slug cannot be changed after creation.</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={4} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"></textarea>
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
        <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required step="0.01" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"/>
      </div>

      <div>
        <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">Sale Price (Optional)</label>
        <input 
          type="number" 
          name="salePrice" 
          id="salePrice" 
          value={formData.salePrice === undefined ? '' : formData.salePrice} 
          onChange={handleChange} 
          step="0.01" 
          placeholder="e.g., 79.99"
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
        />
        <p className="mt-1 text-xs text-gray-500">Leave blank if not on sale.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Images (URLs)</label>
        {formData.images.map((image, index) => (
          <div key={index} className="flex items-center mt-1">
            <input
              type="url"
              value={image}
              onChange={(e) => handleImageChange(index, e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
            />
            {formData.images.length > 1 && (
              <button type="button" onClick={() => removeImageField(index)} className="ml-2 text-red-500 hover:text-red-700">Remove</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addImageField} className="mt-2 text-sm text-purple-600 hover:text-purple-800">Add Another Image</button>
         <p className="mt-1 text-xs text-gray-500">Enter direct URLs for product images.</p>
      </div>
      
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
        <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"/>
      </div>

      <div>
        <label htmlFor="sizes" className="block text-sm font-medium text-gray-700">Sizes (comma-separated)</label>
        <input type="text" name="sizes" id="sizes" value={formData.sizes.join(', ')} onChange={(e) => handleArrayChange(e, 'sizes')} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"/>
      </div>

      <div>
        <label htmlFor="colors" className="block text-sm font-medium text-gray-700">Colors (comma-separated)</label>
        <input type="text" name="colors" id="colors" value={formData.colors.join(', ')} onChange={(e) => handleArrayChange(e, 'colors')} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"/>
      </div>

      <div>
        <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Stock</label>
        <input type="number" name="stock" id="stock" value={formData.stock} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"/>
      </div>

      <div className="flex items-center">
        <input type="checkbox" name="featured" id="featured" checked={formData.featured} onChange={handleChange} className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"/>
        <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">Featured Product</label>
      </div>

      <div className="flex justify-end space-x-3">
        <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
            disabled={loading}
        >
            Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50"
        >
          {loading ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Product')}
        </button>
      </div>
    </form>
  )
}
