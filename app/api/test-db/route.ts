import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Product from '@/lib/models/Product'
import Category from '@/lib/models/Category'

export async function GET() {
  try {
    await dbConnect()
    
    const productCount = await Product.countDocuments()
    const categoryCount = await Category.countDocuments()
    
    const sampleProduct = await Product.findOne()
    const sampleCategory = await Category.findOne()
    
    return NextResponse.json({
      status: 'success',
      database: 'eCommerceDB',
      collections: {
        products: {
          count: productCount,
          sample: sampleProduct
        },
        categories: {
          count: categoryCount,
          sample: sampleCategory
        }
      }
    })
  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 })
  }
}
