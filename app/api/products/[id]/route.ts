import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Product from '@/lib/models/Product'
import { isAdmin } from '@/lib/auth/adminCheck' // Assuming you want to protect these routes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()

    const product = await Product.findById(params.id)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const productObj = product.toObject()

    // Calculate sale price if on sale
    if (productObj.saleConfig?.isOnSale) {
      let salePrice = productObj.price

      if (productObj.saleConfig.saleType === 'percentage') {
        salePrice = productObj.price * (1 - productObj.saleConfig.saleValue / 100)
      } else if (productObj.saleConfig.saleType === 'amount') {
        salePrice = productObj.price - productObj.saleConfig.saleValue
      }

      // Ensure sale price is not negative
      salePrice = Math.max(0, salePrice)
      productObj.salePrice = parseFloat(salePrice.toFixed(2))
      productObj.effectivePrice = productObj.salePrice
    } else {
      productObj.effectivePrice = productObj.price
    }

    return NextResponse.json(productObj)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminAccess = await isAdmin()
  if (!adminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await dbConnect()

    const productId = params.id
    const body = await request.json()

    // Ensure slug is not updated if it's part of the body for an existing product
    // Slugs should generally be immutable or handled with care (e.g., creating redirects)
    if (body.slug) {
      delete body.slug;
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, body, {
      new: true, // Return the updated document
      runValidators: true, // Ensure schema validations are run
    })

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(updatedProduct)
  } catch (error: any) {
    console.error('Error updating product:', error)
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminAccess = await isAdmin()
  if (!adminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await dbConnect()

    const productId = params.id
    const deletedProduct = await Product.findByIdAndDelete(productId)

    if (!deletedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
