'use client'

import { useState, useEffect } from 'react'
import Image from "next/image"
import Link from "next/link"
import { useCart } from '@/lib/contexts/CartContext'
import Header from "@/components/Header"

interface Product {
  _id: string
  name: string
  description: string
  price: number
  salePrice?: number
  saleConfig?: {
    isOnSale: boolean
    saleType: 'percentage' | 'amount'
    saleValue: number
  }
  images: string[]
  category: string
  sizes?: string[]
  colors?: string[]
  stock: number
  featured: boolean
  rating: number
  reviews: number
  createdAt?: string
}

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [sortBy, setSortBy] = useState<string>('featured')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const { addToCart } = useCart()

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products?limit=50'),
          fetch('/api/categories')
        ])

        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setProducts(productsData)
          setFilteredProducts(productsData)
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products]

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Price filter
    filtered = filtered.filter(product =>
      product.price >= priceRange[0] && product.price <= priceRange[1]
    )

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        break
      default:
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    }

    setFilteredProducts(filtered)
  }, [products, selectedCategory, priceRange, sortBy, searchQuery])

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1)
    // You could add a toast notification here
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            Filters & Search
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-x-8">
          {/* Mobile Filters Overlay */}
          {showMobileFilters && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileFilters(false)}>
              <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Mobile Filters Content */}
                  <div className="space-y-6">
                    {/* Search */}
                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-3">Search</h3>
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* Categories */}
                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-3">Categories</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className={`block w-full text-left px-3 py-2 rounded-md text-sm ${selectedCategory === 'all'
                            ? 'bg-purple-100 text-purple-800 font-medium'
                            : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                            }`}
                        >
                          All Products
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category._id}
                            onClick={() => setSelectedCategory(category.slug)}
                            className={`block w-full text-left px-3 py-2 rounded-md text-sm capitalize ${selectedCategory === category.slug
                              ? 'bg-purple-100 text-purple-800 font-medium'
                              : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                              }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <h3 className="text-base font-medium text-gray-900 mb-3">Price Range</h3>
                      <div className="space-y-3">
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>$0</span>
                          <span>${priceRange[1]}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={priceRange[0]}
                            onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000])}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block space-y-8">
            {/* Search */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Search</h3>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${searchQuery ? "text-gray-700" : "text-gray-400"
                  }`}
              />
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`block w-full text-left px-3 py-2 rounded-md text-sm ${selectedCategory === 'all'
                    ? 'bg-purple-100 text-purple-800 font-medium'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                >
                  All Products
                </button>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm capitalize ${selectedCategory === category.slug
                      ? 'bg-purple-100 text-purple-800 font-medium'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Price Range</h3>
              <div className="space-y-4">
                <div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider text-gray-400"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>$0</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                    className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-400"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000])}
                    className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Filters</h3>
              <div className="space-y-2">
                <button className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50">
                  On Sale
                </button>
                <button className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50">
                  New Arrivals
                </button>
                <button className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50">
                  Best Sellers
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Header with Sort */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Products</h1>
                <p className="mt-1 sm:mt-2 text-gray-600 text-sm sm:text-base">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <div key={product._id} className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all duration-300">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    <Link href={`/products/${product._id}`}>
                      <Image
                        src={product.images[0] || '/placeholder-image.jpg'}
                        alt={product.name}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    {/* Badges */}
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-2">
                      {product.featured && (
                        <span className="bg-purple-600 text-white text-xs px-1.5 sm:px-2 py-1 rounded-full font-medium">
                          Featured
                        </span>
                      )}
                      {product.stock === 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 sm:px-2 py-1 rounded-full font-medium">
                          Sold Out
                        </span>
                      )}
                    </div>

                    {/* Quick Add Button */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
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
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-xs sm:text-sm text-gray-500 capitalize">{product.category}</p>
                    </div>

                    {/* Rating */}
                    {product.rating > 0 && (
                      <div className="flex items-center mb-2 sm:mb-3">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-200'
                                }`}
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
                        <span className="text-lg sm:text-xl font-bold text-gray-900">{product.salePrice ? (
                          <>
                            <span className="text-sm text-gray-500 line-through">${product.price}</span>
                            <span className="text-lg sm:text-xl font-bold text-red-600">${product.salePrice}</span>
                          </>
                        ) : (
                          <span className="text-lg sm:text-xl font-bold text-gray-900">${product.price}</span>
                        )}</span>
                        {product.stock > 0 && product.stock <= 5 && (
                          <p className="text-xs text-orange-600 font-medium">Only {product.stock} left!</p>
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
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.2-5.5-3m11.5 3.207A7.997 7.997 0 0122 12c0-4.418-3.582-8-8-8s-8 3.582-8 8a7.29 7.29 0 001.845 4.844l.757.757a1 1 0 01-.707 1.707H9.5a.5.5 0 01-.5-.5v-5a.5.5 0 01.5-.5z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setPriceRange([0, 1000])
                    setSearchQuery('')
                  }}
                  className="mt-4 btn-primary"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
