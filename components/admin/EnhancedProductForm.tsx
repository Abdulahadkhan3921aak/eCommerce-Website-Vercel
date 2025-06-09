'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUpload from './ImageUpload'
import UnitManager from './UnitManager'

export interface ProductUnit {
    _id?: string
    name: string
    size?: string
    color?: string
    price: number
    stock: number
    images: string[] // Only used for color variants, empty for size-only variants
    saleConfig: {
        isOnSale: boolean
        saleType: 'percentage' | 'amount'
        saleValue: number
    }
    unitId?: string
    sku?: string
    // New properties to clarify the unit type
    isColorVariant?: boolean // true if this unit represents a color variation
    isSizeVariant?: boolean  // true if this unit represents a size variation
}

// Update interface to extend the unified ProductFormData
export interface EnhancedProductFormData {
    _id?: string
    name: string
    description: string
    category: string
    price: number
    stock: number
    images: string[]
    units: ProductUnit[]
    saleConfig: {
        isOnSale: boolean
        saleType: 'percentage' | 'amount'
        saleValue: number
    }
    // Add compatibility fields
    sizes?: string[]
    colors?: string[]
    featured?: boolean
    slug?: string
    salePrice?: number
}

interface EnhancedProductFormProps {
    initialData?: EnhancedProductFormData
    onSubmit: (data: EnhancedProductFormData) => Promise<void>
    isEditing?: boolean
}

export default function EnhancedProductForm({ initialData, onSubmit, isEditing = false }: EnhancedProductFormProps) {
    const [formData, setFormData] = useState<EnhancedProductFormData>({
        name: '',
        description: '',
        category: '',
        price: 0,
        stock: 0,
        images: [],
        units: [],
        saleConfig: {
            isOnSale: false,
            saleType: 'percentage',
            saleValue: 0
        },
        // Default values for compatibility
        sizes: [],
        colors: [],
        featured: false,
        slug: ''
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Generate slug if missing
                slug: initialData.slug || initialData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') || '',
                sizes: initialData.sizes || [],
                colors: initialData.colors || [],
                featured: initialData.featured || false
            })
        }
    }, [initialData])

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Product name is required'
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required'
        }
        if (!formData.category.trim()) {
            newErrors.category = 'Category is required'
        }
        if (formData.price <= 0) {
            newErrors.price = 'Price must be greater than 0'
        }
        if (formData.stock < 0) {
            newErrors.stock = 'Stock cannot be negative'
        }

        // Validate units
        formData.units.forEach((unit, index) => {
            if (!unit.name.trim()) {
                newErrors[`unit_${index}_name`] = 'Unit name is required'
            }
            if (unit.price <= 0) {
                newErrors[`unit_${index}_price`] = 'Unit price must be greater than 0'
            }
            if (unit.stock < 0) {
                newErrors[`unit_${index}_stock`] = 'Unit stock cannot be negative'
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) return

        setLoading(true)
        try {
            // Ensure slug is generated
            const dataToSubmit = {
                ...formData,
                slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
            }
            await onSubmit(dataToSubmit)
        } catch (error: any) {
            console.error('Form submission error:', error)
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: keyof EnhancedProductFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const handleSaleConfigChange = (field: keyof typeof formData.saleConfig, value: any) => {
        setFormData(prev => ({
            ...prev,
            saleConfig: { ...prev.saleConfig, [field]: value }
        }))
    }

    const handleUnitsChange = (units: ProductUnit[]) => {
        setFormData(prev => ({ ...prev, units }))
    }

    const handleImagesChange = (images: string[]) => {
        setFormData(prev => ({ ...prev, images }))
    }

    return (
        <div className="bg-white shadow-sm rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
                {/* Basic Product Information */}
                <div className="space-y-6">
                    <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Basic Information
                    </h2>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className={`mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'focus:border-purple-500 focus:ring-purple-500'
                                    }`}
                                placeholder="Enter product name"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                Category *
                            </label>
                            <input
                                type="text"
                                name="category"
                                id="category"
                                value={formData.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                                className={`mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'focus:border-purple-500 focus:ring-purple-500'
                                    }`}
                                placeholder="Enter category"
                            />
                            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description *
                        </label>
                        <textarea
                            name="description"
                            id="description"
                            rows={4}
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            className={`mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'focus:border-purple-500 focus:ring-purple-500'
                                }`}
                            placeholder="Enter product description"
                        />
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                                Base Price * ($)
                            </label>
                            <input
                                type="number"
                                name="price"
                                id="price"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                                className={`mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'focus:border-purple-500 focus:ring-purple-500'
                                    }`}
                                placeholder="0.00"
                            />
                            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                        </div>

                        <div>
                            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                                Base Stock *
                            </label>
                            <input
                                type="number"
                                name="stock"
                                id="stock"
                                min="0"
                                value={formData.stock}
                                onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                                className={`mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors.stock ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'focus:border-purple-500 focus:ring-purple-500'
                                    }`}
                                placeholder="0"
                            />
                            {errors.stock && <p className="mt-1 text-sm text-red-600">{errors.stock}</p>}
                        </div>
                    </div>
                </div>

                {/* Product Images */}
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Product Images
                    </h2>
                    <p className="text-sm text-gray-600">
                        These images will be used as fallback for units that don't have their own images.
                    </p>
                    <ImageUpload
                        images={formData.images}
                        onImagesChange={handleImagesChange}
                        maxImages={10}
                    />
                </div>

                {/* Product Sale Configuration */}
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Product-Wide Sale
                    </h2>
                    <div className="flex items-center">
                        <input
                            id="productSale"
                            name="productSale"
                            type="checkbox"
                            checked={formData.saleConfig.isOnSale}
                            onChange={(e) => handleSaleConfigChange('isOnSale', e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="productSale" className="ml-2 block text-sm text-gray-900">
                            Enable sale for entire product
                        </label>
                    </div>

                    {formData.saleConfig.isOnSale && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-gray-50 p-4 rounded-md">
                            <div>
                                <label htmlFor="saleType" className="block text-sm font-medium text-gray-700">
                                    Sale Type
                                </label>
                                <select
                                    id="saleType"
                                    value={formData.saleConfig.saleType}
                                    onChange={(e) => handleSaleConfigChange('saleType', e.target.value as 'percentage' | 'amount')}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="amount">Fixed Amount ($)</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="saleValue" className="block text-sm font-medium text-gray-700">
                                    Sale Value
                                </label>
                                <input
                                    type="number"
                                    id="saleValue"
                                    step="0.01"
                                    min="0"
                                    value={formData.saleConfig.saleValue}
                                    onChange={(e) => handleSaleConfigChange('saleValue', parseFloat(e.target.value) || 0)}
                                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                                    placeholder={formData.saleConfig.saleType === 'percentage' ? '20' : '10.00'}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Units Management */}
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Product Units/Variants
                    </h2>
                    <p className="text-sm text-gray-600">
                        Add different units or variants of this product with their own prices, stock, and images.
                    </p>
                    <UnitManager
                        units={formData.units}
                        onUnitsChange={handleUnitsChange}
                        productImages={formData.images}
                        errors={errors}
                    />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <Link
                        href="/admin/products"
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    )
}
