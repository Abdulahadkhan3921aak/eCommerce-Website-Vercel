'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import ProductSearch from '@/components/admin/ProductSearch'
import ProductFilters from '@/components/admin/ProductFilters'
import ProductBulkActions from '@/components/admin/ProductBulkActions'
import ProductsTable from '@/components/admin/ProductsTable'
import ProductCards from '@/components/admin/ProductCards'
import { Product } from '@/models/Product'
import { usePopup } from '@/lib/contexts/PopupContext'

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
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
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('')
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
  const [bulkAction, setBulkAction] = useState<'setPrice' | 'setSale' | 'removeSale' | 'setTax' | ''>('')
  const [saleType, setSaleType] = useState<'percentage' | 'amount'>('percentage')
  const [bulkValue, setBulkValue] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const { showAlert, showConfirm } = usePopup()

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

      if (activeSearchQuery) params.append('search', activeSearchQuery)
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

      // Update filter options if provided
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
    }
  }, [])

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts(1)
  }, [fetchProducts])

  // Update search loading state
  useEffect(() => {
    if (searchQuery !== activeSearchQuery) {
      setSearchLoading(true)
    }
  }, [searchQuery, activeSearchQuery])

  // Initial load
  useEffect(() => {
    fetchFilterOptions()
    fetchProducts(1)
  }, [])

  // Event handlers
  const handlePageChange = (page: number) => {
    fetchProducts(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const handleSelectAll = (checked: boolean) => {
    if (checked && products && products.length > 0) {
      setSelectedProductIds(new Set(products.map(p => p?._id).filter(Boolean)))
    } else {
      setSelectedProductIds(new Set())
    }
  }

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
          fetchProducts(currentPage)
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

    if ((bulkAction === 'setPrice' || bulkAction === 'setSale' || bulkAction === 'setTax') && bulkValue === '') {
      showAlert('Please enter a value.', 'warning')
      return
    }

    if (bulkAction === 'setTax') {
      const taxValue = parseFloat(bulkValue)
      if (isNaN(taxValue) || taxValue < 0 || taxValue > 100) {
        showAlert('Tax percentage must be between 0 and 100.', 'warning')
        return
      }
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

  const handleSearch = () => {
    setActiveSearchQuery(searchQuery)
    setCurrentPage(1)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setActiveSearchQuery('')
    setCurrentPage(1)
  }

  const handleFilterChange = (field: string, value: string) => {
    switch (field) {
      case 'category':
        setFilterCategory(value)
        break
      case 'size':
        setFilterSize(value)
        break
      case 'color':
        setFilterColor(value)
        break
      case 'stockStatus':
        setFilterStockStatus(value)
        break
      case 'priceMin':
        setFilterPriceMin(value)
        break
      case 'priceMax':
        setFilterPriceMax(value)
        break
      case 'sortBy':
        setSortBy(value)
        break
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setActiveSearchQuery('')
    setFilterCategory('')
    setFilterPriceMin('')
    setFilterPriceMax('')
    setFilterSize('')
    setFilterColor('')
    setFilterStockStatus('')
    setSortBy('newest')
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

  const isAllSelected = products && products.length > 0 && selectedProductIds.size === products.length

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
          {/* Header */}
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

          {/* Search Component */}
          <ProductSearch
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            searchLoading={searchLoading}
            activeSearchQuery={activeSearchQuery}
          />

          {/* Filters Component */}
          <ProductFilters
            filterCategory={filterCategory}
            filterSize={filterSize}
            filterColor={filterColor}
            filterStockStatus={filterStockStatus}
            filterPriceMin={filterPriceMin}
            filterPriceMax={filterPriceMax}
            sortBy={sortBy}
            allCategories={allCategories}
            allSizes={allSizes}
            allColors={allColors}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
          />

          {/* Bulk Actions Component */}
          <ProductBulkActions
            selectedCount={selectedProductIds.size}
            bulkAction={bulkAction}
            saleType={saleType}
            bulkValue={bulkValue}
            bulkLoading={bulkLoading}
            onBulkActionChange={setBulkAction}
            onSaleTypeChange={setSaleType}
            onBulkValueChange={setBulkValue}
            onApplyBulkAction={handleApplyBulkAction}
          />

          {/* Products Table - Desktop */}
          <ProductsTable
            products={products}
            selectedProductIds={selectedProductIds}
            onSelectProduct={handleSelectProduct}
            onSelectAll={handleSelectAll}
            onDeleteProduct={handleDeleteProduct}
            isAllSelected={isAllSelected}
          />

          {/* Products Cards - Mobile */}
          <ProductCards
            products={products}
            selectedProductIds={selectedProductIds}
            onSelectProduct={handleSelectProduct}
            onDeleteProduct={handleDeleteProduct}
          />

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
                    <button
                      onClick={() => handlePageChange(1)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                    >
                      1
                    </button>
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
        </div>
      </main>
    </div>
  )
}
