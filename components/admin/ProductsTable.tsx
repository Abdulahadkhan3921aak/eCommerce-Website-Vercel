'use client'

import Link from 'next/link'
import { Product } from '@/models/Product'

interface ProductsTableProps {
    products: Product[]
    selectedProductIds: Set<string>
    onSelectProduct: (productId: string) => void
    onSelectAll: (checked: boolean) => void
    onDeleteProduct: (productId: string) => void
    isAllSelected: boolean
}

export default function ProductsTable({
    products,
    selectedProductIds,
    onSelectProduct,
    onSelectAll,
    onDeleteProduct,
    isAllSelected
}: ProductsTableProps) {
    const renderPriceInfo = (product: Product) => {
        if (product?.units && product.units.length > 0) {
            const prices = product.units.map(u => u?.price || 0)
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            return (
                <div className="text-xs">
                    <div className="font-medium">Units: {product.units.length}</div>
                    {minPrice === maxPrice || product.units.length === 1 ? (
                        <div>Price: ${minPrice.toFixed(2)}</div>
                    ) : (
                        <div>Price range: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}</div>
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
            return <span>${(product?.price || 0).toFixed(2)}</span>
        }
    }

    const renderSaleInfo = (product: Product) => {
        const hasProductSale = product?.saleConfig?.isOnSale
        const hasUnitSales = product?.units?.some(u => u?.saleConfig?.isOnSale)

        if (hasProductSale || hasUnitSales) {
            return (
                <div className="space-y-1">
                    {hasProductSale && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Product: {product.saleConfig.saleValue}
                            {product.saleConfig.saleType === 'percentage' ? '%' : '$'} off
                        </span>
                    )}
                    {hasUnitSales && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Unit sales active
                        </span>
                    )}
                </div>
            )
        }
        return <span className="text-gray-400">No sale</span>
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
        return <span>{product?.stock || 0}</span>
    }

    return (
        <div className="hidden lg:block bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    checked={isAllSelected}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    disabled={products.length === 0}
                                />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Price
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tax %
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sale
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    No products found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => (
                                <tr
                                    key={product?._id || 'unknown'}
                                    className={selectedProductIds.has(product?._id || '') ? 'bg-purple-50' : ''}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            checked={selectedProductIds.has(product?._id || '')}
                                            onChange={() => product?._id && onSelectProduct(product._id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {product?.name || 'Unknown Product'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {product?.category || 'No Category'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {renderPriceInfo(product)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(product?.tax || 0) > 0
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {(product?.tax || 0).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {renderSaleInfo(product)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {renderStockInfo(product)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {product?._id && (
                                            <div className="flex items-center space-x-2">
                                                <Link
                                                    href={`/admin/products/edit/${product._id}`}
                                                    className="text-purple-600 hover:text-purple-900"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => onDeleteProduct(product._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
