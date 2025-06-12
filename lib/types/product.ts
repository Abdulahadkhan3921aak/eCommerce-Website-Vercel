export interface SaleConfig {
    isOnSale: boolean
    saleType: 'percentage' | 'amount'
    saleValue: number
}

export interface ProductUnit {
    _id?: string
    unitId?: string
    size?: string
    color?: string
    price: number
    stock: number
    images: string[]
    saleConfig: SaleConfig
    sku?: string
}

export type ProductCategory = 'ring' | 'earring' | 'bracelet' | 'necklace'

// Category display names and validation
export const PRODUCT_CATEGORIES: Record<ProductCategory, string> = {
    ring: 'Ring',
    earring: 'Earring',
    bracelet: 'Bracelet',
    necklace: 'Necklace'
}

// Helper function to validate category
export function isValidCategory(category: string): category is ProductCategory {
    return Object.keys(PRODUCT_CATEGORIES).includes(category)
}

// Helper function to normalize category (convert plural to singular)
export function normalizeCategory(category: string): ProductCategory | null {
    const normalized = category.toLowerCase().trim()

    // Direct matches (singular forms)
    if (isValidCategory(normalized)) {
        return normalized as ProductCategory
    }

    // Convert plural to singular
    const pluralToSingular: Record<string, ProductCategory> = {
        'rings': 'ring',
        'earrings': 'earring',
        'bracelets': 'bracelet',
        'necklaces': 'necklace'
    }

    return pluralToSingular[normalized] || null
}

// Calculate the effective price for a unit considering both product-level and unit-level sales
export function getUnitEffectivePrice(product: Product, unit: ProductUnit): number {
    if (!unit) return product.price

    // Check if unit has its own sale configuration
    if (unit.saleConfig?.isOnSale && unit.saleConfig.saleValue > 0) {
        let salePrice = unit.price

        if (unit.saleConfig.saleType === 'percentage' && unit.saleConfig.saleValue <= 100) {
            salePrice = unit.price * (1 - unit.saleConfig.saleValue / 100)
        } else if (unit.saleConfig.saleType === 'amount') {
            salePrice = unit.price - unit.saleConfig.saleValue
        }

        return Math.max(0, parseFloat(salePrice.toFixed(2)))
    }

    // Check if product has global sale configuration that applies to units
    if (product.saleConfig?.isOnSale && product.saleConfig.saleValue > 0) {
        let salePrice = unit.price

        if (product.saleConfig.saleType === 'percentage' && product.saleConfig.saleValue <= 100) {
            salePrice = unit.price * (1 - product.saleConfig.saleValue / 100)
        } else if (product.saleConfig.saleType === 'amount') {
            salePrice = unit.price - product.saleConfig.saleValue
        }

        return Math.max(0, parseFloat(salePrice.toFixed(2)))
    }

    return unit.price
}

// Calculate sale price for a product (legacy products without units)
export function getProductDisplayPrice(product: Product): number {
    if (!product) return 0

    // If product has units, this function shouldn't be used
    if (product.units && product.units.length > 0) {
        console.warn('getProductDisplayPrice called on product with units, use getUnitEffectivePrice instead')
        return product.price
    }

    // Check for existing salePrice field first (for backward compatibility)
    if (typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.price) {
        return product.salePrice
    }

    // Calculate from saleConfig
    if (product.saleConfig?.isOnSale && product.saleConfig.saleValue > 0) {
        let salePrice = product.price

        if (product.saleConfig.saleType === 'percentage' && product.saleConfig.saleValue <= 100) {
            salePrice = product.price * (1 - product.saleConfig.saleValue / 100)
        } else if (product.saleConfig.saleType === 'amount') {
            salePrice = product.price - product.saleConfig.saleValue
        }

        return Math.max(0, parseFloat(salePrice.toFixed(2)))
    }

    return product.price
}

// Get price range for products with units
export function getProductPriceRange(product: Product): { min: number; max: number } {
    if (!product.units || product.units.length === 0) {
        const effectivePrice = getProductDisplayPrice(product)
        return { min: effectivePrice, max: effectivePrice }
    }

    const prices = product.units.map(unit => getUnitEffectivePrice(product, unit))
    return {
        min: Math.min(...prices),
        max: Math.max(...prices)
    }
}

// Check if a unit is on sale
export function isUnitOnSale(product: Product, unit: ProductUnit): boolean {
    if (unit.saleConfig?.isOnSale) return true
    if (product.saleConfig?.isOnSale) return true
    return false
}

// Check if product has any sales
export function hasAnySale(product: Product): boolean {
    if (product.saleConfig?.isOnSale) return true
    if (product.units?.some(unit => unit.saleConfig?.isOnSale)) return true
    return false
}

// Get sale information for display
export function getSaleInfo(product: Product, unit?: ProductUnit) {
    if (unit?.saleConfig?.isOnSale) {
        return {
            isOnSale: true,
            saleType: unit.saleConfig.saleType,
            saleValue: unit.saleConfig.saleValue,
            originalPrice: unit.price,
            salePrice: getUnitEffectivePrice(product, unit)
        }
    }

    if (product.saleConfig?.isOnSale) {
        const basePrice = unit ? unit.price : product.price
        return {
            isOnSale: true,
            saleType: product.saleConfig.saleType,
            saleValue: product.saleConfig.saleValue,
            originalPrice: basePrice,
            salePrice: unit ? getUnitEffectivePrice(product, unit) : getProductDisplayPrice(product)
        }
    }

    return null
}

// Get the best available image from a product (product images first, then unit images)
export function getProductDisplayImage(product: Product): string {
    // First try product-level images
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        const validImage = product.images.find(img =>
            img && typeof img === 'string' && img.trim().length > 0
        );
        if (validImage) {
            const cleanUrl = validImage.trim();
            if (cleanUrl.startsWith('http') || cleanUrl.startsWith('/')) {
                return cleanUrl;
            }
        }
    }

    // Then try unit-level images
    if (product.units && Array.isArray(product.units) && product.units.length > 0) {
        for (const unit of product.units) {
            if (unit.images && Array.isArray(unit.images) && unit.images.length > 0) {
                const validImage = unit.images.find(img =>
                    img && typeof img === 'string' && img.trim().length > 0
                );
                if (validImage) {
                    const cleanUrl = validImage.trim();
                    if (cleanUrl.startsWith('http') || cleanUrl.startsWith('/')) {
                        return cleanUrl;
                    }
                }
            }
        }
    }

    return '/placeholder-image.png';
}

// Get all available images from a product (combining product and unit images)
export function getAllProductImages(product: Product): string[] {
    const allImages: string[] = [];

    // Add product images
    if (product.images && Array.isArray(product.images)) {
        const validProductImages = product.images.filter(img =>
            img && typeof img === 'string' && img.trim().length > 0
        );
        allImages.push(...validProductImages);
    }

    // Add unit images
    if (product.units && Array.isArray(product.units)) {
        product.units.forEach(unit => {
            if (unit.images && Array.isArray(unit.images)) {
                const validUnitImages = unit.images.filter(img =>
                    img && typeof img === 'string' && img.trim().length > 0
                );
                allImages.push(...validUnitImages);
            }
        });
    }

    // Remove duplicates and return
    const uniqueImages = [...new Set(allImages)];
    return uniqueImages.length > 0 ? uniqueImages : ['/placeholder-image.png'];
}
