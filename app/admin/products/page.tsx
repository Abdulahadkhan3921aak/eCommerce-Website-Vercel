'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Product } from '@/models/Product'
import { usePopup } from '@/lib/contexts/PopupContext'

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // State for selections
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())

  // State for filters
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('') // New state for active search
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterPriceMin, setFilterPriceMin] = useState<string>('')
  const [filterPriceMax, setFilterPriceMax] = useState<string>('')
  const [filterSize, setFilterSize] = useState<string>('')
  const [filterColor, setFilterColor] = useState<string>('')
  const [filterStockStatus, setFilterStockStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('newest')

  // Available filter options
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [allSizes, setAllSizes] = useState<string[]>([])
  const [allColors, setAllColors] = useState<string[]>([])

  // State for bulk actions
  const [bulkAction, setBulkAction] = useState<'setPrice' | 'setSale' | 'removeSale' | ''>('')
  const [saleType, setSaleType] = useState<'percentage' | 'amount'>('percentage')
  const [bulkValue, setBulkValue] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const { showAlert, showConfirm } = usePopup()

  // Remove debounce hook usage for search
  const fetchProducts = useCallback(async (page: number = 1, isSearching: boolean = false) => {
    try {
      if (isSearching) {
        setSearchLoading(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
      })

      if (activeSearchQuery) params.append('search', activeSearchQuery) // Use activeSearchQuery instead
      if (filterCategory) params.append('category', filterCategory)
      if (filterPriceMin) params.append('minPrice', filterPriceMin)
      if (filterPriceMax) params.append('maxPrice', filterPriceMax)
      if (filterSize) params.append('size', filterSize)
      if (filterColor) params.append('color', filterColor)
      if (filterStockStatus) params.append('stockStatus', filterStockStatus)

      const response = await fetch(`/api/admin/products?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }
      const data = await response.json()

      setProducts(data.products || [])
      setPagination(data.pagination || null)
      setCurrentPage(data.pagination?.currentPage || 1)

      // Only update filter options if they're provided AND we don't already have them
      // This prevents losing filter options when filtering results
      if (data.filterOptions && Object.keys(data.filterOptions).length > 0) {
        if (allCategories.length === 0 && data.filterOptions.categories) {
          setAllCategories(data.filterOptions.categories)
        }
        if (allSizes.length === 0 && data.filterOptions.sizes) {
          setAllSizes(data.filterOptions.sizes)
        }
        if (allColors.length === 0 && data.filterOptions.colors) {
          setAllColors(data.filterOptions.colors)
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error occurred while fetching products'
      setError(errorMessage)
      console.error('Error fetching products:', err)
      setProducts([])
      setPagination(null)
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }, [activeSearchQuery, filterCategory, filterPriceMin, filterPriceMax, filterSize, filterColor, filterStockStatus, sortBy, itemsPerPage, allCategories.length, allSizes.length, allColors.length])

  // Add a separate function to fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products?getFilterOptions=true')
      if (response.ok) {
        const data = await response.json()
        if (data.filterOptions) {
          setAllCategories(data.filterOptions.categories || [])
          setAllSizes(data.filterOptions.sizes || [])
          setAllColors(data.filterOptions.colors || [])
        }
      }
    } catch (error) {
      console.error('Error fetching filter options:', error)
      // Don't set error state for filter options, just log it
    }
  }, [])

  // Fetch products when active search or other filters change
  useEffect(() => {
    fetchProducts(1) // Always start from page 1 when filters change
  }, [fetchProducts])

  // Update search loading state
  useEffect(() => {
    if (searchQuery !== activeSearchQuery) {
      setSearchLoading(true)
    }
  }, [searchQuery, activeSearchQuery])

  // Initial load - fetch both products and filter options
  useEffect(() => {
    fetchFilterOptions()
    fetchProducts(1)
  }, [])

  const handlePageChange = (page: number) => {
    fetchProducts(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    if (!pagination) return []

    const pageNumbers = []
    const maxVisiblePages = 5
    const totalPages = pagination.totalPages

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return pageNumbers
  }

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
    if (e.target.checked && products && products.length > 0) {
      setSelectedProductIds(new Set(products.map(p => p?._id).filter(Boolean)))
    } else {
      setSelectedProductIds(new Set())
    }
  }

  const isAllSelected = products && products.length > 0 && selectedProductIds.size === products.length

  const handleDeleteProduct = async (productId: string) => {
    showConfirm(
      'Are you sure you want to delete this product? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
          })
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to delete product')
          }
          showAlert('Product deleted successfully', 'success')
          fetchProducts(currentPage) // Refresh current page
        } catch (err: any) {
          console.error('Error deleting product:', err)
          showAlert(`Error: ${err.message}`, 'error')
        }
      },
      undefined,
      'Delete Product'
    )
  }

  const handleApplyBulkAction = async () => {
    if (selectedProductIds.size === 0 || !bulkAction) {
      showAlert('Please select products and an action.', 'warning')
      return
    }

    if ((bulkAction === 'setPrice' || bulkAction === 'setSale') && bulkValue === '') {
      showAlert('Please enter a value.', 'warning')
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

      showAlert('Bulk update successful!', 'success')
      setSelectedProductIds(new Set())
      setBulkAction('')
      setBulkValue('')
      await fetchProducts(currentPage)
    } catch (err: any) {
      console.error('Bulk update error:', err)
      showAlert(`Error: ${err.message}`, 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  // Add search handler
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery)
    setCurrentPage(1)
  }

  // Add clear search handler
  const handleClearSearch = () => {
    setSearchQuery('')
    setActiveSearchQuery('')
    setCurrentPage(1)
  }

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setActiveSearchQuery('') // Clear active search too
    setFilterCategory('')
    setFilterPriceMin('')
    setFilterPriceMax('')
    setFilterSize('')
    setFilterColor('')
    setFilterStockStatus('')
    setSortBy('newest')
  }

  if (loading && !products.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="ml-4 text-lg text-gray-600">Loading products...</p>
      </div>
    )
  }

  if (error && !products.length) {
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
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Product Management</h1>
              {pagination && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing {((pagination.currentPage - 1) * itemsPerPage) + 1}-{Math.min(pagination.currentPage * itemsPerPage, pagination.totalCount)} of {pagination.totalCount} products
                </p>
              )}
            </div>
            <Link
              href="/admin/products/new"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out text-center"
            >
              Add New Product
            </Link>
          </div>

          {/* Enhanced Search Bar with Button */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="Search products by name, description, unit size, or color..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
              >
                {searchLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </div>
                ) : (
                  'Search'
                )}
              </button>
              {(searchQuery || activeSearchQuery) && (
                <button
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition duration-150 ease-in-out"
                >
                  Clear
                </button>
              )}
            </div>
            {activeSearchQuery && (
              <div className="mt-2 text-sm text-gray-600">
                Searching for: <span className="font-medium text-purple-600">"{activeSearchQuery}"</span>
              </div>
            )}
          </div>

          {/* Enhanced Filters Section */}
          <div className="p-3 sm:p-4 bg-white shadow sm:rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-lg font-medium text-gray-900">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {/* Category Filter */}
              <div>
                <label htmlFor="filterCategory" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  id="filterCategory"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="">All Categories</option>
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {/* Size Filter */}
              <div>
                <label htmlFor="filterSize" className="block text-sm font-medium text-gray-700">Size</label>
                <select
                  id="filterSize"
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="">All Sizes</option>
                  {allSizes.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>

              {/* Color Filter */}
              <div>
                <label htmlFor="filterColor" className="block text-sm font-medium text-gray-700">Color</label>
                <select
                  id="filterColor"
                  value={filterColor}
                  onChange={(e) => setFilterColor(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="">All Colors</option>
                  {allColors.map(color => <option key={color} value={color}>{color}</option>)}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div>
                <label htmlFor="filterStockStatus" className="block text-sm font-medium text-gray-700">Stock Status</label>
                <select
                  id="filterStockStatus"
                  value={filterStockStatus}
                  onChange={(e) => setFilterStockStatus(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                >
                  <option value="">All Stock Levels</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock (≤5)</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label htmlFor="filterPriceMin" className="block text-sm font-medium text-gray-700">Min Price</label>
                <input
                  type="number"
                  id="filterPriceMin"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  placeholder="Min"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="filterPriceMax" className="block text-sm font-medium text-gray-700">Max Price</label>
                <input
                  type="number"
                  id="filterPriceMax"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  placeholder="Max"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 rounded-md text-gray-900"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="stock_low">Stock: Low to High</option>
                  <option value="stock_high">Stock: High to Low</option>
                </select>
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
                        disabled={products.length === 0}
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
                  {products && products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        No products found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product?._id || 'unknown'} className={selectedProductIds.has(product?._id || '') ? 'bg-purple-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            checked={selectedProductIds.has(product?._id || '')}
                            onChange={() => product?._id && handleSelectProduct(product._id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product?.name || 'Unknown Product'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product?.category || 'No Category'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            {product?.units && product.units.length > 0 ? (
                              <div className="text-xs">
                                <div className="font-medium">Units: {product.units.length}</div>
                                <div>Price range: ${Math.min(...product.units.map(u => u?.price || 0)).toFixed(2)} - ${Math.max(...product.units.map(u => u?.price || 0)).toFixed(2)}</div>
                              </div>
                            ) : product?.salePrice ? (
                              <>
                                <span className="line-through text-gray-400">${(product?.price || 0).toFixed(2)}</span>
                                <span className="text-red-600 font-medium">${product.salePrice.toFixed(2)}</span>
                              </>
                            ) : (
                              <span>${(product?.price || 0).toFixed(2)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product?.saleConfig?.isOnSale || product?.units?.some(u => u?.saleConfig?.isOnSale) ? (
                            <div className="space-y-1">
                              {product?.saleConfig?.isOnSale && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Product: {product.saleConfig.saleValue}
                                  {product.saleConfig.saleType === 'percentage' ? '%' : '$'} off
                                </span>
                              )}
                              {product?.units?.some(u => u?.saleConfig?.isOnSale) && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Unit sales active
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No sale</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product?.units && product.units.length > 0 ? (
                            <div className="text-xs">
                              <div>Total: {product?.totalStock || product.units.reduce((sum, unit) => sum + (unit?.stock || 0), 0)}</div>
                              <div>Units: {product.units.length}</div>
                            </div>
                          ) : (
                            <span>{product?.stock || 0}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {product?._id && (
                            <>
                              <Link href={`/admin/products/edit/${product._id}`} className="text-purple-600 hover:text-purple-900 mr-3">
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDeleteProduct(product._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </>
                          )}
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
            {!products || products.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center text-gray-500">
                No products found matching your filters.
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product?._id || 'unknown'}
                  className={`bg-white p-4 rounded-lg shadow border border-gray-200 ${selectedProductIds.has(product?._id || '') ? 'ring-2 ring-purple-200 bg-purple-50' : ''
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-1"
                        checked={selectedProductIds.has(product?._id || '')}
                        onChange={() => product?._id && handleSelectProduct(product._id)}
                      />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{product?.name || 'Unknown Product'}</h3>
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
                            onClick={() => handleDeleteProduct(product._id)}
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
                      <div className="flex items-center gap-2">
                        {product?.units && product.units.length > 0 ? (
                          <div className="text-xs">
                            <div>Units: {product.units.length}</div>
                            <div>${Math.min(...product.units.map(u => u?.price || 0)).toFixed(2)} - ${Math.max(...product.units.map(u => u?.price || 0)).toFixed(2)}</div>
                          </div>
                        ) : product?.salePrice ? (
                          <>
                            <span className="line-through text-gray-400">${(product?.price || 0).toFixed(2)}</span>
                            <span className="text-red-600 font-medium">${product.salePrice.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="font-medium">${(product?.price || 0).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Stock:</span>
                      <div className="mt-1">
                        {product?.units && product.units.length > 0 ? (
                          <div className="text-xs">
                            <div>Total: {product?.totalStock || product.units.reduce((sum, unit) => sum + (unit?.stock || 0), 0)}</div>
                            <div>Units: {product.units.length}</div>
                          </div>
                        ) : (
                          <span className="font-medium">{product?.stock || 0}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Sale:</span>
                      {product?.saleConfig?.isOnSale || product?.units?.some(u => u?.saleConfig?.isOnSale) ? (
                        <div className="space-y-1">
                          {product?.saleConfig?.isOnSale && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-1">
                              Product: {product.saleConfig.saleValue}
                              {product.saleConfig.saleType === 'percentage' ? '%' : '$'} off
                            </span>
                          )}
                          {product?.units?.some(u => u?.saleConfig?.isOnSale) && (
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  Previous
                </button>

                {currentPage > 3 && (
                  <>
                    <button onClick={() => handlePageChange(1)} className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">1</button>
                    {currentPage > 4 && <span className="px-2 text-gray-700">...</span>}
                  </>
                )}

                {getPageNumbers().map((number) => (
                  <button
                    key={number}
                    onClick={() => handlePageChange(number)}
                    disabled={loading}
                    className={`px-3 py-2 text-sm border rounded-md text-gray-700 ${currentPage === number
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 hover:bg-gray-50'
                      } disabled:opacity-50`}
                  >
                    {number}
                  </button>
                ))}

                {currentPage < pagination.totalPages - 2 && (
                  <>
                    {currentPage < pagination.totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                    <button
                      onClick={() => handlePageChange(pagination.totalPages)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage || loading}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div >
      </main >
    </div >
  )
}
