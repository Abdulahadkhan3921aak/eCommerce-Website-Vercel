'use client'

import Link from 'next/link'
import { Product } from '@/models/Product'

interface ProductCardsProps {
    products: Product[]
    selectedProductIds: Set<string>
    onSelectProduct: (productId: string) => void
    onDeleteProduct: (productId: string) => void
}

export default function ProductCards({
    products,
    selectedProductIds,
    onSelectProduct,
    onDeleteProduct
}: ProductCardsProps) {
    const renderPriceInfo = (product: Product) => {
        if (product?.units && product.units.length > 0) {
            const prices = product.units.map(u => u?.price || 0)
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            return (
                <div className="text-xs">
                    <div>Units: {product.units.length}</div>
                    {minPrice === maxPrice || product.units.length === 1 ? (
                        <div>${minPrice.toFixed(2)}</div>
                    ) : (
                        <div>${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}</div>
                    )}
                </div>
            )
        } else if (product?.salePrice) {
            return (
                <div className="flex items-center gap-2">
                    <span className="line-through text-gray-400">${(product?.price || 0).toFixed(2)}</span>
                    <span className="text-red-600 font-medium">${product.salePrice.toFixed(2)}</span>
                </div>
            )
        } else {
            return <span className="font-medium">${(product?.price || 0).toFixed(2)}</span>
        }
    }

    const renderSaleInfo = (product: Product) => {
        const hasProductSale = product?.saleConfig?.isOnSale
        const hasUnitSales = product?.units?.some(u => u?.saleConfig?.isOnSale)

        if (hasProductSale || hasUnitSales) {
            return (
                <div className="space-y-1">
                    {hasProductSale && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
                            Product: {product.saleConfig.saleValue}
                            {product.saleConfig.saleType === 'percentage' ? '%' : '$'} off
                        </span>
                    )}
                    {hasUnitSales && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-1">
                            Unit sales
                        </span>
                    )}
                </div>
            )
        }
        return <span className="text-gray-400 ml-1">No sale</span>
    }

    const renderStockInfo = (product: Product) => {
        if (product?.units && product.units.length > 0) {
            const totalStock = product?.totalStock || product.units.reduce((sum, unit) => sum + (unit?.stock || 0), 0)
            return (
                <div className="text-xs">
                    <div>Total: {totalStock}</div>
                    <div>Units: {product.units.length}</div>
                </div>
            )
        }
        return <span className="font-medium">{product?.stock || 0}</span>
    }

    if (products.length === 0) {
        return (
            <div className="lg:hidden">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center text-gray-500">
                    No products found matching your filters.
                </div>
            </div>
        )
    }

    return (
        <div className="lg:hidden space-y-4">
            {products.map((product) => (
                <div
                    key={product?._id || 'unknown'}
                    className={`bg-white p-4 rounded-lg shadow border border-gray-200 ${selectedProductIds.has(product?._id || '')
                            ? 'ring-2 ring-purple-200 bg-purple-50'
                            : ''
                        }`}
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-1"
                                checked={selectedProductIds.has(product?._id || '')}
                                onChange={() => product?._id && onSelectProduct(product._id)}
                            />
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">
                                    {product?.name || 'Unknown Product'}
                                </h3>
                                <p className="text-xs text-gray-500">{product?.category || 'No Category'}</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            {product?._id && (
                                <>
                                    <Link
                                        href={`/admin/products/edit/${product._id}`}
                                        className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => onDeleteProduct(product._id)}
                                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-gray-500">Price:</span>
                            <div className="mt-1">
                                {renderPriceInfo(product)}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500">Tax:</span>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(product?.tax || 0) > 0
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {(product?.tax || 0).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500">Stock:</span>
                            <div className="mt-1">
                                {renderStockInfo(product)}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500">Sale:</span>
                            <div className="mt-1">
                                {renderSaleInfo(product)}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
