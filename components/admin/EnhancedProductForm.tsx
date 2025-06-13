'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ImageUpload from './ImageUpload'
import { PRODUCT_CATEGORIES, type ProductCategory, type ProductFormData, type ProductUnit, generateUnitId } from '@/lib/types/product'

interface EnhancedProductFormProps {
    initialData?: ProductFormData
    onSubmit: (data: ProductFormData) => Promise<void>
    isEditing?: boolean
}

export default function EnhancedProductForm({ initialData, onSubmit, isEditing = false }: EnhancedProductFormProps) {
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: '',
        category: 'ring',
        colors: [],
        sizes: [],
        units: [],
        saleConfig: {
            isOnSale: false,
            saleType: 'percentage',
            saleValue: 0
        },
        tax: 0,
        featured: false,
        slug: ''
    })

    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    const [newColor, setNewColor] = useState('')
    const [newSize, setNewSize] = useState('')

    // Category options
    const categoryOptions: Array<{ value: ProductCategory; label: string }> = [
        { value: 'ring', label: 'Ring' },
        { value: 'earring', label: 'Earring' },
        { value: 'bracelet', label: 'Bracelet' },
        { value: 'necklace', label: 'Necklace' }
    ]

    // Predefined options for quick selection
    const commonColors = ['Black', 'White', 'Silver', 'Gold', 'Rose Gold', 'Blue', 'Red', 'Green', 'Purple', 'Pink']
    const commonSizes = {
        ring: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'],
        bracelet: ['XS', 'S', 'M', 'L', 'XL'],
        necklace: ['14"', '16"', '18"', '20"', '22"', '24"'],
        earring: ['Small', 'Medium', 'Large']
    }

    useEffect(() => {
        if (initialData) {
            setFormData(initialData)
        }
    }, [initialData])

    // Auto-generate units when colors or sizes change
    useEffect(() => {
        if (formData.colors.length > 0 && formData.sizes.length > 0) {
            const newUnits: ProductUnit[] = []

            formData.colors.forEach(color => {
                formData.sizes.forEach(size => {
                    const unitId = generateUnitId(color, size)

                    // Check if unit already exists (for editing)
                    const existingUnit = formData.units.find(unit => unit.unitId === unitId)

                    if (existingUnit) {
                        newUnits.push(existingUnit)
                    } else {
                        // Create new unit with default values
                        newUnits.push({
                            unitId,
                            color,
                            size,
                            price: 0,
                            stock: 0,
                            images: [],
                            saleConfig: {
                                isOnSale: false,
                                saleType: 'percentage',
                                saleValue: 0
                            }
                        })
                    }
                })
            })

            setFormData(prev => ({ ...prev, units: newUnits }))
        } else {
            setFormData(prev => ({ ...prev, units: [] }))
        }
    }, [formData.colors, formData.sizes])

    const validateForm = (): string[] => {
        const errors: string[] = []

        if (!formData.name?.trim()) {
            errors.push('Product name is required')
        }

        if (!formData.description?.trim()) {
            errors.push('Product description is required')
        }

        if (!formData.category?.trim()) {
            errors.push('Product category is required')
        }

        if (formData.colors.length === 0) {
            errors.push('At least one color is required')
        }

        if (formData.sizes.length === 0) {
            errors.push('At least one size is required')
        }

        // Validate units
        formData.units.forEach((unit, index) => {
            if (!unit.price || unit.price <= 0) {
                errors.push(`Unit ${unit.color} - ${unit.size}: Price is required and must be greater than 0`)
            }

            if (unit.stock < 0) {
                errors.push(`Unit ${unit.color} - ${unit.size}: Stock cannot be negative`)
            }

            if (!unit.images || unit.images.length === 0) {
                errors.push(`Unit ${unit.color} - ${unit.size}: At least one image is required`)
            }
        })

        return errors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            setLoading(true)
            setErrors([])

            const validationErrors = validateForm()
            if (validationErrors.length > 0) {
                setErrors(validationErrors)
                return
            }

            await onSubmit(formData)

        } catch (error) {
            console.error('Form submission error:', error)
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
            setErrors([errorMessage])
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: keyof ProductFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
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

    const addColor = (color: string) => {
        if (color && !formData.colors.includes(color)) {
            setFormData(prev => ({ ...prev, colors: [...prev.colors, color] }))
        }
    }

    const removeColor = (color: string) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.filter(c => c !== color)
        }))
    }

    const addSize = (size: string) => {
        if (size && !formData.sizes.includes(size)) {
            setFormData(prev => ({ ...prev, sizes: [...prev.sizes, size] }))
        }
    }

    const removeSize = (size: string) => {
        setFormData(prev => ({
            ...prev,
            sizes: prev.sizes.filter(s => s !== size)
        }))
    }

    const updateUnit = (unitId: string, field: keyof ProductUnit, value: any) => {
        setFormData(prev => ({
            ...prev,
            units: prev.units.map(unit =>
                unit.unitId === unitId
                    ? { ...unit, [field]: value }
                    : unit
            )
        }))
    }

    const updateUnitSaleConfig = (unitId: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            units: prev.units.map(unit =>
                unit.unitId === unitId
                    ? { ...unit, saleConfig: { ...unit.saleConfig, [field]: value } }
                    : unit
            )
        }))
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
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                                placeholder="Enter product name"
                            />
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
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                            >
                                {categoryOptions.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
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
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                            placeholder="Enter product description"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="tax" className="block text-sm font-medium text-gray-700">
                                Tax Rate (%)
                            </label>
                            <input
                                type="number"
                                name="tax"
                                id="tax"
                                step="0.01"
                                min="0"
                                max="100"
                                value={formData.tax || 0}
                                onChange={(e) => handleInputChange('tax', parseFloat(e.target.value) || 0)}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex items-center space-x-4 pt-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.featured}
                                    onChange={(e) => handleInputChange('featured', e.target.checked)}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">Featured Product</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Colors Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Colors *
                    </h2>

                    {/* Add new color */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            placeholder="Enter custom color"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                addColor(newColor)
                                setNewColor('')
                            }}
                            disabled={!newColor.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>

                    {/* Quick color selection */}
                    <div>
                        <p className="text-sm text-gray-600 mb-2">Quick select:</p>
                        <div className="flex flex-wrap gap-2">
                            {commonColors.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => addColor(color)}
                                    disabled={formData.colors.includes(color)}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {color}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected colors */}
                    {formData.colors.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Selected colors:</p>
                            <div className="flex flex-wrap gap-2">
                                {formData.colors.map(color => (
                                    <span
                                        key={color}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                                    >
                                        {color}
                                        <button
                                            type="button"
                                            onClick={() => removeColor(color)}
                                            className="ml-2 text-purple-600 hover:text-purple-800"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sizes Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                        Sizes *
                    </h2>

                    {/* Add new size */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newSize}
                            onChange={(e) => setNewSize(e.target.value)}
                            placeholder="Enter custom size"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                addSize(newSize)
                                setNewSize('')
                            }}
                            disabled={!newSize.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>

                    {/* Quick size selection */}
                    <div>
                        <p className="text-sm text-gray-600 mb-2">Quick select for {formData.category}:</p>
                        <div className="flex flex-wrap gap-2">
                            {commonSizes[formData.category]?.map(size => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => addSize(size)}
                                    disabled={formData.sizes.includes(size)}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected sizes */}
                    {formData.sizes.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Selected sizes:</p>
                            <div className="flex flex-wrap gap-2">
                                {formData.sizes.map(size => (
                                    <span
                                        key={size}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                    >
                                        {size}
                                        <button
                                            type="button"
                                            onClick={() => removeSize(size)}
                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Product-Wide Sale Configuration */}
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
                {formData.units.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                            Product Units ({formData.units.length} combinations)
                        </h2>
                        <p className="text-sm text-gray-600">
                            Configure pricing, stock, and images for each color-size combination.
                        </p>

                        <div className="space-y-6">
                            {formData.units.map((unit, index) => (
                                <div key={unit.unitId} className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="text-md font-medium text-gray-900 mb-4">
                                        {unit.color} - {unit.size}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Price * ($)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={unit.price}
                                                onChange={(e) => updateUnit(unit.unitId, 'price', parseFloat(e.target.value) || 0)}
                                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Stock *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={unit.stock}
                                                onChange={(e) => updateUnit(unit.unitId, 'stock', parseInt(e.target.value) || 0)}
                                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Unit Sale Configuration */}
                                    <div className="mb-4">
                                        <div className="flex items-center mb-2">
                                            <input
                                                type="checkbox"
                                                checked={unit.saleConfig.isOnSale}
                                                onChange={(e) => updateUnitSaleConfig(unit.unitId, 'isOnSale', e.target.checked)}
                                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                            />
                                            <label className="ml-2 block text-sm text-gray-900">
                                                Individual sale for this unit
                                            </label>
                                        </div>

                                        {unit.saleConfig.isOnSale && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
                                                <div>
                                                    <select
                                                        value={unit.saleConfig.saleType}
                                                        onChange={(e) => updateUnitSaleConfig(unit.unitId, 'saleType', e.target.value)}
                                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                                                    >
                                                        <option value="percentage">Percentage (%)</option>
                                                        <option value="amount">Fixed Amount ($)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={unit.saleConfig.saleValue}
                                                        onChange={(e) => updateUnitSaleConfig(unit.unitId, 'saleValue', parseFloat(e.target.value) || 0)}
                                                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                                                        placeholder={unit.saleConfig.saleType === 'percentage' ? '20' : '10.00'}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Unit Images */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Images for {unit.color} - {unit.size} *
                                        </label>
                                        <ImageUpload
                                            images={unit.images}
                                            onImagesChange={(images) => updateUnit(unit.unitId, 'images', images)}
                                            maxImages={5}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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

// Export the types for use in other files
export type { ProductFormData as EnhancedProductFormData }
