'use client'

import { useState, useEffect } from 'react'
import Image from "next/image"
import Link from "next/link"
import { useCart } from '@/lib/contexts/CartContext'
import { usePopup } from '@/lib/contexts/PopupContext'
import Header from "@/components/Header"
import { Product, getProductPriceRange, isUnitOnSale, hasAnySale } from '@/lib/types/product'

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [sortBy, setSortBy] = useState<string>('featured')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const { addToCart } = useCart()
  const { showAlert } = usePopup()

  // Fetch products with pagination and filters
  const fetchProducts = async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString(),
      })

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      console.log('Fetching products with params:', params.toString())
      const response = await fetch(`/api/products?${params}`)

      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', data)
        console.log('Fetched products:', data.products?.length || 0, 'Total:', data.pagination?.totalCount || 0)

        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products)
          setPagination(data.pagination || null)
          setCurrentPage(data.pagination?.currentPage || 1)
        } else {
          console.error('Invalid products data structure:', data)
          setProducts([])
          setPagination(null)
          setError('Invalid data received from server')
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch products:', response.status, errorText)
        setProducts([])
        setPagination(null)
        setError(`Failed to fetch products: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
      setPagination(null)
      setError('Network error while fetching products')
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories once
  useEffect(() => {
    async function fetchCategories() {
      try {
        const categoriesRes = await fetch('/api/categories')
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData || [])
        } else {
          console.error('Failed to fetch categories:', await categoriesRes.text())
          setCategories([])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
      }
    }
    fetchCategories()
  }, [])

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts(1) // Always start from page 1 when filters change
  }, [selectedCategory, priceRange, sortBy, searchQuery])

  // Initial load
  useEffect(() => {
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

  const handleAddToCart = (product: Product) => {
    try {
      if (!product || !product._id) {
        console.error('Invalid product data:', product)
        showAlert('Invalid product selected', 'error')
        return
      }

      // Validate base product price
      if (typeof product.price !== 'number' || product.price <= 0) {
        console.error('Invalid base product price:', product.price, product)
        showAlert('This product has invalid pricing. Please contact support.', 'error')
        return
      }

      // For products with units, find the first available unit with valid pricing
      if (product.units && product.units.length > 0) {
        const availableUnit = product.units.find(unit =>
          unit &&
          unit.unitId &&
          (typeof unit.stock !== 'number' || unit.stock > 0) &&
          typeof unit.price === 'number' &&
          unit.price > 0
        )
        if (availableUnit) {
          addToCart(product, 1, availableUnit.size, availableUnit.color, availableUnit.unitId)
        } else {
          console.warn('No available units with valid pricing found for product:', product._id)
          showAlert('This product is currently out of stock or has invalid pricing', 'warning')
        }
      } else {
        // Legacy product without units
        if (product.totalStock === 0 || product.stock === 0) {
          showAlert('This product is currently out of stock', 'warning')
          return
        }
        addToCart(product, 1) // Don't pass undefined unitId
      }
    } catch (error) {
      console.error('Error in handleAddToCart:', error)
      showAlert('Error adding item to cart', 'error')
    }
  }

  // Enhanced helper function to get a valid image URL from product or units
  const getValidImageUrl = (product: Product): string => {

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

    // Then try unit-level images - check each unit for images
    if (product.units && Array.isArray(product.units) && product.units.length > 0) {
      for (const unit of product.units) {
        if (unit.images && Array.isArray(unit.images) && unit.images.length > 0) {
          const validImage = unit.images.find(img =>
            img && typeof img === 'string' && img.trim().length > 0
          );
          if (validImage) {
            const cleanUrl = validImage.trim();
            if (cleanUrl.startsWith('http') || cleanUrl.startsWith('/') || cleanUrl.startsWith('data:')) {
              return cleanUrl;
            }
          }
        }
      }
    }

    console.log('No valid images found, using placeholder');
    return '/placeholder-image.png';
  }

  if (loading && !products.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error && !products.length) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8 max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-4">Error Loading Products</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchProducts(1)}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-4 sm:py-8 max-w-7xl mx-auto">
        {/* Search and Filter Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Our Products {selectedCategory !== 'all' && `- ${selectedCategory}`}
            </h1>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden btn-outline flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-2V8m0 8v2m6-8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-2V8" />
              </svg>
              Filters & Sort
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters - Desktop */}
          <div className="hidden lg:flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Price:</label>
              <input
                type="range"
                min="0"
                max="1000"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                className="slider"
              />
              <span className="text-sm text-gray-600">${priceRange[0]}</span>
              <span className="text-sm text-gray-500">-</span>
              <input
                type="range"
                min="0"
                max="1000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="slider"
              />
              <span className="text-sm text-gray-600">${priceRange[1]}</span>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {/* Mobile Filters */}
          {showMobileFilters && (
            <div className="lg:hidden p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                    className="w-full slider"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full slider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="mb-6">
          {pagination && (
            <p className="text-gray-600">
              Showing {((pagination.currentPage - 1) * itemsPerPage) + 1}-{Math.min(pagination.currentPage * itemsPerPage, pagination.totalCount)} of {pagination.totalCount} products
              {searchQuery && ` for "${searchQuery}"`}
              {loading && <span className="ml-2 text-purple-600">Loading...</span>}
            </p>
          )}
          {!loading && products.length === 0 && !error && (
            <p className="text-gray-600">No products found matching your criteria.</p>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {products.map((product) => {
            const productPriceRange = getProductPriceRange(product);
            const hasVariedPricing = !productPriceRange.isSinglePrice;
            const productHasAnySale = hasAnySale(product);
            const validImageUrl = getValidImageUrl(product);

            return (
              <div key={product._id} className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all duration-300">
                {/* Product Image */}
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  <Link href={`/products/${product._id}`}>
                    {validImageUrl !== '/placeholder-image.png' ? (
                      <Image
                        src={validImageUrl}
                        alt={product.name || 'Product image'}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs">No Image</span>
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Badges */}
                  <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-2">
                    {product.featured && (
                      <span className="bg-purple-600 text-white text-xs px-1.5 sm:px-2 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    )}
                    {productHasAnySale && (
                      <span className="bg-red-500 text-white text-xs px-1.5 sm:px-2 py-1 rounded-full font-medium">
                        Sale
                      </span>
                    )}
                    {(product.totalStock || product.stock) === 0 && (
                      <span className="bg-gray-500 text-white text-xs px-1.5 sm:px-2 py-1 rounded-full font-medium">
                        Sold Out
                      </span>
                    )}
                  </div>

                  {/* Quick Add Button */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={(product.totalStock || product.stock) === 0}
                    className="absolute top-2 sm:top-3 right-2 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h8a2 2 0 002-2v-6M7 13H5a2 2 0 00-2 2v4a2 2 0 002 2h2" />
                    </svg>
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-3 sm:p-4">
                  <div className="mb-2">
                    <Link href={`/products/${product._id}`}>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors line-clamp-2">
                        {product.name || 'Unnamed Product'}
                      </h3>
                    </Link>
                    <p className="text-xs sm:text-sm text-gray-500 capitalize">{product.category || 'Uncategorized'}</p>
                  </div>

                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="flex items-center mb-2 sm:mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-200'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-1 text-xs sm:text-sm text-gray-500">({product.reviews})</span>
                    </div>
                  )}

                  {/* Price and Actions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">
                        {hasVariedPricing ? (
                          <div className="flex flex-col">
                            <span>${productPriceRange.min.toFixed(2)} - ${productPriceRange.max.toFixed(2)}</span>
                            {productHasAnySale && (
                              <span className="text-xs text-red-600 font-medium">Sale prices included</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {productHasAnySale ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 line-through">
                                  ${product.units && product.units.length > 0 ?
                                    product.units[0].price.toFixed(2) :
                                    product.price.toFixed(2)}
                                </span>
                                <span className="text-red-600">${productPriceRange.min.toFixed(2)}</span>
                              </div>
                            ) : (
                              <span>${productPriceRange.min.toFixed(2)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {((product.totalStock || product.stock) > 0 && (product.totalStock || product.stock) <= 5) && (
                        <p className="text-xs text-orange-600 font-medium">Only {product.totalStock || product.stock} left!</p>
                      )}
                    </div>
                    <Link
                      href={`/products/${product._id}`}
                      className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
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
                  <button onClick={() => handlePageChange(pagination.totalPages)} className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">
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
    </div>
  )
}
