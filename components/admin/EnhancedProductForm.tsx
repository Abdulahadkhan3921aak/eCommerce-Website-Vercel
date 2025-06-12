'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUpload from './ImageUpload'
import UnitManager from './UnitManager'
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/types/product'

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
    category: ProductCategory // Use the strict type
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
        category: 'ring', // Default to first category
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
    const [errors, setErrors] = useState<string[]>([])

    // Updated category options - only singular forms
    const categoryOptions: Array<{ value: ProductCategory; label: string }> = [
        { value: 'ring', label: 'Ring' },
        { value: 'earring', label: 'Earring' },
        { value: 'bracelet', label: 'Bracelet' },
        { value: 'necklace', label: 'Necklace' }
    ]

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

    const validateForm = (): string[] => {
        const errors: string[] = []

        // Basic product validation
        if (!formData.name?.trim()) {
            errors.push('Product name is required')
        }

        if (!formData.description?.trim()) {
            errors.push('Product description is required')
        }

        if (!formData.category?.trim()) {
            errors.push('Product category is required')
        }

        // Price validation
        const price = parseFloat(formData.price as string)
        if (isNaN(price) || price < 0) {
            errors.push('Product price must be a valid positive number')
        }

        // Sale price validation (if provided)
        if (formData.salePrice && formData.salePrice !== '') {
            const salePrice = parseFloat(formData.salePrice as string)
            if (isNaN(salePrice) || salePrice < 0) {
                errors.push('Sale price must be a valid positive number')
            } else if (salePrice >= price) {
                errors.push('Sale price must be less than regular price')
            }
        }

        // Images validation
        if (!formData.images || formData.images.length === 0) {
            errors.push('At least one product image is required')
        }

        // Units validation (if product has units)
        if (formData.units && formData.units.length > 0) {
            formData.units.forEach((unit, index) => {
                if (!unit.unitId?.trim()) {
                    errors.push(`Unit ${index + 1}: Unit ID is required`)
                }

                const unitPrice = parseFloat(unit.price as string)
                if (isNaN(unitPrice) || unitPrice < 0) {
                    errors.push(`Unit ${index + 1}: Price must be a valid positive number`)
                }

                if (unit.salePrice && unit.salePrice !== '') {
                    const unitSalePrice = parseFloat(unit.salePrice as string)
                    if (isNaN(unitSalePrice) || unitSalePrice < 0) {
                        errors.push(`Unit ${index + 1}: Sale price must be a valid positive number`)
                    } else if (unitSalePrice >= unitPrice) {
                        errors.push(`Unit ${index + 1}: Sale price must be less than regular price`)
                    }
                }

                const unitStock = parseInt(unit.stock as string, 10)
                if (isNaN(unitStock) || unitStock < 0) {
                    errors.push(`Unit ${index + 1}: Stock must be a valid non-negative number`)
                }
            })
        } else {
            // Non-unit product stock validation
            const stock = parseInt(formData.stock as string, 10)
            if (isNaN(stock) || stock < 0) {
                errors.push('Stock must be a valid non-negative number')
            }
        }

        // Dimensions validation (if provided)
        if (formData.dimensions) {
            const { length, width, height } = formData.dimensions
            if (length && (isNaN(parseFloat(length as string)) || parseFloat(length as string) < 0)) {
                errors.push('Length must be a valid positive number')
            }
            if (width && (isNaN(parseFloat(width as string)) || parseFloat(width as string) < 0)) {
                errors.push('Width must be a valid positive number')
            }
            if (height && (isNaN(parseFloat(height as string)) || parseFloat(height as string) < 0)) {
                errors.push('Height must be a valid positive number')
            }
        }

        // Weight validation (if provided)
        if (formData.weight && formData.weight !== '') {
            const weight = parseFloat(formData.weight as string)
            if (isNaN(weight) || weight < 0) {
                errors.push('Weight must be a valid positive number')
            }
        }

        return errors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            setLoading(true)
            setErrors([])

            // Validate form
            const validationErrors = validateForm()
            if (validationErrors.length > 0) {
                setErrors(validationErrors)
                return
            }

            // Prepare form data for submission
            const submissionData = {
                ...formData,
                price: parseFloat(formData.price as string),
                stock: formData.units && formData.units.length > 0 ? undefined : parseInt(formData.stock as string, 10),
                units: formData.units && formData.units.length > 0 ? formData.units.map(unit => ({
                    ...unit,
                    price: parseFloat(unit.price as string),
                    stock: parseInt(unit.stock as string, 10),
                })) : undefined,
            }

            console.log('Form submission data:', submissionData) // Debug log

            // Call the onSubmit handler passed from parent
            await onSubmit(submissionData)

        } catch (error) {
            console.error('Form submission error:', error)
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
            setErrors([errorMessage])
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: keyof EnhancedProductFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear errors when user starts typing
        if (errors.length > 0) {
            setErrors([])
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
                {/* Display validation errors */}
                {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                    Please fix the following errors:
                                </h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <ul className="list-disc space-y-1 pl-5">
                                        {errors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                            <select
                                name="category"
                                id="category"
                                value={formData.category}
                                onChange={(e) => handleInputChange('category', e.target.value as ProductCategory)}
                                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900 ${errors.category ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'focus:border-purple-500 focus:ring-purple-500'
                                    }`}
                            >
                                <option value="">Select Category</option>
                                {categoryOptions.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
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
