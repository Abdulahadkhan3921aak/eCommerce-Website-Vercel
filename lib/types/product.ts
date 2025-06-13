export const PRODUCT_CATEGORIES = [
    'ring',
    'earring',
    'bracelet',
    'necklace'
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]

// Helper function to normalize category (convert plural to singular)
export const normalizeCategory = (category: string): ProductCategory | null => {
    if (!category || typeof category !== 'string') {
        return null
    }

    const normalized = category.toLowerCase().trim()

    // Handle plural forms
    const categoryMap: Record<string, ProductCategory> = {
        'ring': 'ring',
        'rings': 'ring',
        'earring': 'earring',
        'earrings': 'earring',
        'bracelet': 'bracelet',
        'bracelets': 'bracelet',
        'necklace': 'necklace',
        'necklaces': 'necklace'
    }

    return categoryMap[normalized] || null
}

// Helper function to validate category
export const isValidCategory = (category: string): category is ProductCategory => {
    return PRODUCT_CATEGORIES.includes(category as ProductCategory)
}

export interface ProductUnit {
    _id?: string
    unitId: string // Auto-generated: color-size combination
    color: string
    size: string
    price: number
    stock: number
    images: string[]
    saleConfig: {
        isOnSale: boolean
        saleType: 'percentage' | 'amount'
        saleValue: number
    }
    sku?: string
}

export interface ProductSaleConfig {
    isOnSale: boolean
    saleType: 'percentage' | 'amount'
    saleValue: number
}

export interface ProductFormData {
    _id?: string
    name: string
    description: string
    category: ProductCategory
    colors: string[]
    sizes: string[]
    units: ProductUnit[]
    saleConfig: ProductSaleConfig
    tax?: number // Tax percentage (0-100)
    featured?: boolean
    slug?: string
}

// Add Product interface for compatibility
export interface Product {
    _id: string
    name: string
    description: string
    category: ProductCategory
    price: number
    salePrice?: number
    images: string[]
    colors?: string[]
    sizes?: string[]
    units?: ProductUnit[]
    saleConfig?: ProductSaleConfig
    tax?: number
    featured?: boolean
    slug?: string
    stock?: number
    totalStock?: number
    rating?: number
    reviews?: number
    weight?: number
    dimensions?: { length: number; width: number; height: number }
    createdAt?: Date
    updatedAt?: Date
}

// Helper function to generate unit ID
export const generateUnitId = (color: string, size: string): string => {
    return `${color.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase().replace(/\s+/g, '-')}`
}

// Helper function to get product display price (from first unit)
export const getProductDisplayPrice = (product: Product): number => {
    if (product.units && product.units.length > 0) {
        const firstUnit = product.units[0]
        return getUnitEffectivePrice(product, firstUnit)
    }

    // Legacy product pricing
    if (product.salePrice && product.salePrice < product.price) {
        return product.salePrice
    }

    return product.price || 0
}

// Helper function to get effective price for a specific unit
export const getUnitEffectivePrice = (product: Product, unit: ProductUnit): number => {
    // First check unit-level sale
    if (unit.saleConfig?.isOnSale && unit.saleConfig.saleValue > 0) {
        if (unit.saleConfig.saleType === 'percentage') {
            const discount = unit.price * (unit.saleConfig.saleValue / 100)
            return Math.max(0, unit.price - discount)
        } else {
            return Math.max(0, unit.price - unit.saleConfig.saleValue)
        }
    }

    // Then check product-level sale
    if (product.saleConfig?.isOnSale && product.saleConfig.saleValue > 0) {
        if (product.saleConfig.saleType === 'percentage') {
            const discount = unit.price * (product.saleConfig.saleValue / 100)
            return Math.max(0, unit.price - discount)
        } else {
            return Math.max(0, unit.price - product.saleConfig.saleValue)
        }
    }

    return unit.price
}

// Helper function to get price range for a product
export const getProductPriceRange = (product: Product): { min: number; max: number; isSinglePrice: boolean } => {
    if (!product.units || product.units.length === 0) {
        const effectivePrice = getProductDisplayPrice(product)
        return { min: effectivePrice, max: effectivePrice, isSinglePrice: true }
    }

    const prices = product.units.map(unit => getUnitEffectivePrice(product, unit))
    const min = Math.min(...prices)
    const max = Math.max(...prices)

    return {
        min,
        max,
        isSinglePrice: min === max || product.units.length === 1
    }
}

// Helper function to check if any unit or product is on sale
export const hasAnySale = (product: Product): boolean => {
    // Check product-level sale
    if (product.saleConfig?.isOnSale) {
        return true
    }

    // Check legacy product sale price
    if (product.salePrice && product.salePrice < product.price) {
        return true
    }

    // Check unit-level sales
    if (product.units && product.units.length > 0) {
        return product.units.some(unit =>
            unit.saleConfig?.isOnSale && unit.saleConfig.saleValue > 0
        )
    }

    return false
}

// Helper function to check if a specific unit is on sale
export const isUnitOnSale = (product: Product, unit: ProductUnit): boolean => {
    // Check unit-level sale first
    if (unit.saleConfig?.isOnSale && unit.saleConfig.saleValue > 0) {
        return true
    }

    // Check product-level sale
    if (product.saleConfig?.isOnSale && product.saleConfig.saleValue > 0) {
        return true
    }

    return false
}

// Helper function to get sale information
export const getSaleInfo = (product: Product, unit?: ProductUnit): {
    isOnSale: boolean
    saleType?: 'percentage' | 'amount'
    saleValue?: number
    source?: 'unit' | 'product'
} | null => {
    // Check unit-level sale first
    if (unit?.saleConfig?.isOnSale && unit.saleConfig.saleValue > 0) {
        return {
            isOnSale: true,
            saleType: unit.saleConfig.saleType,
            saleValue: unit.saleConfig.saleValue,
            source: 'unit'
        }
    }

    // Check product-level sale
    if (product.saleConfig?.isOnSale && product.saleConfig.saleValue > 0) {
        return {
            isOnSale: true,
            saleType: product.saleConfig.saleType,
            saleValue: product.saleConfig.saleValue,
            source: 'product'
        }
    }

    // Check legacy product sale
    if (product.salePrice && product.salePrice < product.price) {
        const discount = product.price - product.salePrice
        return {
            isOnSale: true,
            saleType: 'amount',
            saleValue: discount,
            source: 'product'
        }
    }

    return null
}

// Helper function to get product display image (from first unit or product)
export const getProductDisplayImage = (product: Product): string => {
    // First try product-level images
    if (product.images && product.images.length > 0) {
        return product.images[0]
    }

    // Then try first unit's images
    if (product.units && product.units.length > 0) {
        const firstUnit = product.units[0]
        if (firstUnit.images && firstUnit.images.length > 0) {
            return firstUnit.images[0]
        }
    }

    return '/images/placeholder.jpg'
}

// Helper function to get all product images
export const getAllProductImages = (product: Product): string[] => {
    const allImages: string[] = []

    // Add product-level images
    if (product.images) {
        allImages.push(...product.images)
    }

    // Add unit-level images
    if (product.units) {
        product.units.forEach(unit => {
            if (unit.images) {
                allImages.push(...unit.images)
            }
        })
    }

    return [...new Set(allImages)] // Remove duplicates
}

// Helper function to calculate tax amount for a given price
export const calculateTaxAmount = (price: number, taxPercentage: number): number => {
    return price * (taxPercentage || 0) / 100
}

// Helper function to calculate total price with tax
export const calculatePriceWithTax = (price: number, taxPercentage: number): number => {
    return price + calculateTaxAmount(price, taxPercentage)
}

// Helper function to validate tax percentage
export const isValidTaxPercentage = (tax: number): boolean => {
    return tax >= 0 && tax <= 100
}

// Helper function to check if product has varied pricing
export const hasVariedPricing = (product: Product): boolean => {
    const priceRange = getProductPriceRange(product)
    return !priceRange.isSinglePrice
}

// Helper function to get total stock from units
export const getTotalStock = (product: Product): number => {
    if (product.units && product.units.length > 0) {
        return product.units.reduce((total, unit) => total + (unit.stock || 0), 0)
    }
    return product.totalStock || product.stock || 0
}

// Helper function to check if product is out of stock
export const isOutOfStock = (product: Product): boolean => {
    return getTotalStock(product) === 0
}

// Helper function to check if product has low stock
export const hasLowStock = (product: Product, threshold: number = 5): boolean => {
    const totalStock = getTotalStock(product)
    return totalStock > 0 && totalStock <= threshold
}

// Helper function to get available colors for a product
export const getAvailableColors = (product: Product): string[] => {
    if (product.units && product.units.length > 0) {
        return [...new Set(product.units.map(unit => unit.color).filter(Boolean))]
    }
    return product.colors || []
}

// Helper function to get available sizes for a product
export const getAvailableSizes = (product: Product): string[] => {
    if (product.units && product.units.length > 0) {
        return [...new Set(product.units.map(unit => unit.size).filter(Boolean))]
    }
    return product.sizes || []
}

// Helper function to get units by color
export const getUnitsByColor = (product: Product, color: string): ProductUnit[] => {
    if (!product.units) return []
    return product.units.filter(unit => unit.color === color)
}

// Helper function to get units by size
export const getUnitsBySize = (product: Product, size: string): ProductUnit[] => {
    if (!product.units) return []
    return product.units.filter(unit => unit.size === size)
}

// Helper function to find specific unit by color and size
export const findUnit = (product: Product, color: string, size: string): ProductUnit | null => {
    if (!product.units) return null
    return product.units.find(unit => unit.color === color && unit.size === size) || null
}

// Helper function to validate product data
export const validateProduct = (product: Partial<Product>): string[] => {
    const errors: string[] = []

    if (!product.name?.trim()) {
        errors.push('Product name is required')
    }

    if (!product.description?.trim()) {
        errors.push('Product description is required')
    }

    if (!product.category || !isValidCategory(product.category)) {
        errors.push('Valid product category is required')
    }

    if (product.tax !== undefined && !isValidTaxPercentage(product.tax)) {
        errors.push('Tax percentage must be between 0 and 100')
    }

    return errors
}

// Helper function to validate product unit
export const validateProductUnit = (unit: Partial<ProductUnit>): string[] => {
    const errors: string[] = []

    if (!unit.unitId?.trim()) {
        errors.push('Unit ID is required')
    }

    if (!unit.color?.trim()) {
        errors.push('Unit color is required')
    }

    if (!unit.size?.trim()) {
        errors.push('Unit size is required')
    }

    if (typeof unit.price !== 'number' || unit.price <= 0) {
        errors.push('Unit price must be a positive number')
    }

    if (typeof unit.stock !== 'number' || unit.stock < 0) {
        errors.push('Unit stock must be a non-negative number')
    }

    if (!unit.images || !Array.isArray(unit.images) || unit.images.length === 0) {
        errors.push('At least one unit image is required')
    }

    return errors
}

// Helper function to format price for display
export const formatPrice = (price: number, includeCurrency: boolean = true): string => {
    const formatted = price.toFixed(2)
    return includeCurrency ? `$${formatted}` : formatted
}

// Helper function to format price range for display
export const formatPriceRange = (product: Product, includeCurrency: boolean = true): string => {
    const priceRange = getProductPriceRange(product)

    if (priceRange.isSinglePrice) {
        return formatPrice(priceRange.min, includeCurrency)
    }

    return `${formatPrice(priceRange.min, includeCurrency)} - ${formatPrice(priceRange.max, includeCurrency)}`
}

// Helper function to calculate savings amount and percentage
export const calculateSavings = (originalPrice: number, salePrice: number): { amount: number; percentage: number } => {
    const amount = originalPrice - salePrice
    const percentage = (amount / originalPrice) * 100

    return {
        amount: Math.max(0, amount),
        percentage: Math.max(0, percentage)
    }
}

// Helper function to get unit effective price with tax
export const getUnitEffectivePriceWithTax = (product: Product, unit: ProductUnit): number => {
    const basePrice = getUnitEffectivePrice(product, unit)
    return calculatePriceWithTax(basePrice, product.tax || 0)
}

// Helper function to get display price with tax
export const getProductDisplayPriceWithTax = (product: Product): number => {
    const basePrice = getProductDisplayPrice(product)
    return calculatePriceWithTax(basePrice, product.tax || 0)
}
