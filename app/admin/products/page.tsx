'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Product } from '@/models/Product'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for selections
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())

  // State for filters
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterPriceMin, setFilterPriceMin] = useState<string>('')
  const [filterPriceMax, setFilterPriceMax] = useState<string>('')
  const [allCategories, setAllCategories] = useState<string[]>([])

  // State for bulk actions - updated to include sale actions
  const [bulkAction, setBulkAction] = useState<'setPrice' | 'setSale' | 'removeSale' | ''>('')
  const [saleType, setSaleType] = useState<'percentage' | 'amount'>('percentage')
  const [bulkValue, setBulkValue] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)

  async function fetchProducts() {
    try {
      setLoading(true)
      const response = await fetch('/api/products')
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }
      const data = await response.json()
      setProducts(data)
      const uniqueCategories = Array.from(new Set(data.map((p: Product) => p.category).filter(Boolean))) as string[]
      setAllCategories(uniqueCategories)
    } catch (err: any) {
      setError(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => filterCategory ? p.category === filterCategory : true)
      .filter(p => filterPriceMin ? p.price >= parseFloat(filterPriceMin) : true)
      .filter(p => filterPriceMax ? p.price <= parseFloat(filterPriceMax) : true)
  }, [products, filterCategory, filterPriceMin, filterPriceMax])

  const handleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProductIds(new Set(filteredProducts.map(p => p._id)))
    } else {
      setSelectedProductIds(new Set())
    }
  }

  const isAllSelected = filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete product')
      }
      setProducts(products.filter(p => p._id !== productId))
      alert('Product deleted successfully')
    } catch (err: any) {
      console.error('Error deleting product:', err)
      alert(`Error: ${err.message}`)
    }
  }

  const handleApplyBulkAction = async () => {
    if (selectedProductIds.size === 0 || !bulkAction) {
      alert('Please select products and an action.')
      return
    }

    if ((bulkAction === 'setPrice' || bulkAction === 'setSale') && bulkValue === '') {
      alert('Please enter a value.')
      return
    }

    setBulkLoading(true)
    try {
      let endpoint = '/api/products/bulk-update'
      let payload: any = {
        productIds: Array.from(selectedProductIds),
      }

      if (bulkAction === 'setSale' || bulkAction === 'removeSale') {
        endpoint = '/api/products/bulk-sale'
        payload.saleConfig = {
          action: bulkAction,
          type: saleType,
          value: bulkAction === 'setSale' ? parseFloat(bulkValue) : 0,
        }
      } else {
        payload.action = {
          type: bulkAction,
          value: parseFloat(bulkValue)
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Bulk update failed')
      }

      alert('Bulk update successful!')
      setSelectedProductIds(new Set())
      setBulkAction('')
      setBulkValue('')
      await fetchProducts()
    } catch (err: any) {
      console.error('Bulk update error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setBulkLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="ml-4 text-gray-700">Loading products...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Header />
        <div className="text-red-600 p-4 font-medium">Error: {error}</div>
        <Link href="/admin" className="text-purple-600 hover:text-purple-800 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Product Management</h1>
            <Link
              href="/admin/products/new"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center"
            >
              Add New Product
            </Link>
          </div>

          {/* Filters Section */}
          <div className="p-3 sm:p-4 bg-white shadow sm:rounded-lg border border-gray-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Filters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label htmlFor="filterCategory" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  id="filterCategory"
                  name="filterCategory"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="">All Categories</option>
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="filterPriceMin" className="block text-sm font-medium text-gray-700">Min Price</label>
                <input
                  type="number"
                  name="filterPriceMin"
                  id="filterPriceMin"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  placeholder="e.g., 10"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="filterPriceMax" className="block text-sm font-medium text-gray-700">Max Price</label>
                <input
                  type="number"
                  name="filterPriceMax"
                  id="filterPriceMax"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  placeholder="e.g., 100"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Bulk Actions Section */}
          {selectedProductIds.size > 0 && (
            <div className="p-3 sm:p-4 bg-white shadow sm:rounded-lg border border-gray-200">
              <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3">
                Bulk Actions ({selectedProductIds.size} selected)
              </h2>
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:items-end">
                <div>
                  <label htmlFor="bulkAction" className="block text-sm font-medium text-gray-700">Action</label>
                  <select
                    id="bulkAction"
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                  >
                    <option value="">Select Action</option>
                    <option value="setPrice">Set New Price</option>
                    <option value="setSale">Apply Sale</option>
                    <option value="removeSale">Remove Sale</option>
                  </select>
                </div>
                {bulkAction === 'setSale' && (
                  <div>
                    <label htmlFor="saleType" className="block text-sm font-medium text-gray-700">Sale Type</label>
                    <select
                      id="saleType"
                      value={saleType}
                      onChange={(e) => setSaleType(e.target.value as 'percentage' | 'amount')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Fixed Amount ($)</option>
                    </select>
                  </div>
                )}
                {(bulkAction === 'setPrice' || bulkAction === 'setSale') && (
                  <div>
                    <label htmlFor="bulkValue" className="block text-sm font-medium text-gray-700">
                      {bulkAction === 'setSale'
                        ? `${saleType === 'percentage' ? 'Percentage' : 'Amount'}`
                        : 'Price'}
                    </label>
                    <input
                      type="number"
                      id="bulkValue"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      placeholder={bulkAction === 'setSale'
                        ? saleType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'
                        : 'Enter price'}
                      className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                    />
                  </div>
                )}
                <div className="sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={handleApplyBulkAction}
                    disabled={bulkLoading || !bulkAction || ((bulkAction === 'setPrice' || bulkAction === 'setSale') && bulkValue === '')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkLoading ? 'Applying...' : 'Apply to Selected'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products Table - Desktop */}
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
                        onChange={handleSelectAll}
                        disabled={filteredProducts.length === 0}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        No products found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product._id} className={selectedProductIds.has(product._id) ? 'bg-purple-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            checked={selectedProductIds.has(product._id)}
                            onChange={() => handleSelectProduct(product._id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            {product.units && product.units.length > 0 ? (
                              <div className="text-xs">
                                <div className="font-medium">Units: {product.units.length}</div>
                                <div>Price range: ${Math.min(...product.units.map(u => u.price)).toFixed(2)} - ${Math.max(...product.units.map(u => u.price)).toFixed(2)}</div>
                              </div>
                            ) : product.salePrice ? (
                              <>
                                <span className="line-through text-gray-400">${product.price.toFixed(2)}</span>
                                <span className="text-red-600 font-medium">${product.salePrice.toFixed(2)}</span>
                              </>
                            ) : (
                              <span>${product.price.toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.saleConfig?.isOnSale || product.units?.some(u => u.saleConfig?.isOnSale) ? (
                            <div className="space-y-1">
                              {product.saleConfig?.isOnSale && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Product: {product.saleConfig.saleValue}
                                  {product.saleConfig.saleType === 'percentage' ? '%' : '$'} off
                                </span>
                              )}
                              {product.units?.some(u => u.saleConfig?.isOnSale) && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Unit sales
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No sale</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/admin/products/edit/${product._id}`} className="text-purple-600 hover:text-purple-900 mr-3">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Products Cards - Mobile */}
          <div className="lg:hidden space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center text-gray-500">
                No products found matching your filters.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className={`bg-white p-4 rounded-lg shadow border border-gray-200 ${selectedProductIds.has(product._id) ? 'ring-2 ring-purple-200 bg-purple-50' : ''
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-1"
                        checked={selectedProductIds.has(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                      />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                        <p className="text-xs text-gray-500">{product.category}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/products/edit/${product._id}`}
                        className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <div className="flex items-center gap-2">
                        {product.units && product.units.length > 0 ? (
                          <div className="text-xs">
                            <div>Units: {product.units.length}</div>
                            <div>${Math.min(...product.units.map(u => u.price)).toFixed(2)} - ${Math.max(...product.units.map(u => u.price)).toFixed(2)}</div>
                          </div>
                        ) : product.salePrice ? (
                          <>
                            <span className="line-through text-gray-400">${product.price.toFixed(2)}</span>
                            <span className="text-red-600 font-medium">${product.salePrice.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="font-medium">${product.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Stock:</span>
                      <span className="font-medium ml-1">{product.stock}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Sale:</span>
                      {product.saleConfig?.isOnSale || product.units?.some(u => u.saleConfig?.isOnSale) ? (
                        <div className="space-y-1">
                          {product.saleConfig?.isOnSale && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
                              Product: {product.saleConfig.saleValue}
                              {product.saleConfig.saleType === 'percentage' ? '%' : '$'} off
                            </span>
                          )}
                          {product.units?.some(u => u.saleConfig?.isOnSale) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-1">
                              Unit sales
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 ml-1">No sale</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
