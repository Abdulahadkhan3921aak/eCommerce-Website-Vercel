import dbConnect from './mongodb'
import Product from './models/Product'
import Category from './models/Category'

export async function getAllProducts() {
  await dbConnect()
  return await Product.find({}).sort({ createdAt: -1 })
}

export async function getFeaturedProducts() {
  await dbConnect()
  return await Product.find({ featured: true }).limit(8)
}

export async function getProductsByCategory(categorySlug: string) {
  await dbConnect()
  return await Product.find({ category: categorySlug })
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
  return await Product.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ]
  })
}
