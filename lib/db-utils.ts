import dbConnect from './mongodb'
import Product from './models/Product'
import Category from './models/Category'
import Cart from './models/Cart'

export async function getAllProducts() {
  await dbConnect()
  const response = await fetch('/api/products')
  if (response.ok) {
    const data = await response.json()
    return data.products || data // Handle both paginated and direct array responses
  }
  return []
}

export async function getFeaturedProducts() {
  await dbConnect()
  const response = await fetch('/api/products?featured=true&limit=8')
  if (response.ok) {
    const data = await response.json()
    return data.products || data // Handle both paginated and direct array responses
  }
  return []
}

export async function getProductsByCategory(categorySlug: string) {
  await dbConnect()
  const response = await fetch(`/api/products?category=${categorySlug}`)
  if (response.ok) {
    const data = await response.json()
    return data.products || data // Handle both paginated and direct array responses
  }
  return []
}

export async function getProductById(id: string) {
  await dbConnect()
  return await Product.findById(id)
}

export async function getAllCategories() {
  await dbConnect()
  return await Category.find({}).sort({ name: 1 })
}

export async function searchProducts(query: string) {
  await dbConnect()
  const response = await fetch(`/api/products?search=${encodeURIComponent(query)}`)
  if (response.ok) {
    const data = await response.json()
    return data.products || data // Handle both paginated and direct array responses
  }
  return []
}

// Update interfaces to reflect API structure
import { Product } from '@/lib/models/Product'

export interface ApiProductsResponse {
  products: Product[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface CartItem {
  _id: string
  productId: string
  name: string
  price: number
  salePrice?: number
  effectivePrice: number
  quantity: number
  images: string[]
  unitImages?: string[] // Unit-specific images for the selected variant
  category: string
  unitId?: string
  size?: string
  color?: string
  availableStock: number
  weight?: number
  weightUnit?: 'lb' | 'kg' // Add weight unit
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'in' | 'cm'; // Add dimension unit
  }
  // Add tax-related fields
  taxPercentage?: number
  taxAmount?: number
  totalWithTax?: number
  customDetails?: any // For custom items
}

export interface CartState {
  items: CartItem[]
  itemCount: number
  totalPrice: number
  totalTax?: number
  totalWithTax?: number
}

