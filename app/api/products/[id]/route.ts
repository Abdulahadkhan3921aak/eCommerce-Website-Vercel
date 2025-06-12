import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Product from '@/lib/models/Product'
import { isAdmin } from '@/lib/auth/adminCheck'
import { auth, currentUser } from '@clerk/nextjs/server'
import mongoose from 'mongoose'
import { normalizeCategory } from '@/lib/types/product'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()

    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    const product = await Product.findById(id)

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use the same admin check as DELETE for consistency
    const adminAccess = await isAdmin()
    if (!adminAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { id: productId } = await params
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    const updateData = await request.json()
    console.log('Update data received:', JSON.stringify(updateData, null, 2))

    // More flexible validation - only validate if fields are provided
    if (updateData.name !== undefined && !updateData.name?.trim()) {
      return NextResponse.json({ error: 'Product name cannot be empty' }, { status: 400 })
    }

    if (updateData.description !== undefined && !updateData.description?.trim()) {
      return NextResponse.json({ error: 'Product description cannot be empty' }, { status: 400 })
    }

    if (updateData.category !== undefined) {
      if (!updateData.category?.trim()) {
        return NextResponse.json({ error: 'Product category cannot be empty' }, { status: 400 })
      }

      const normalizedCategory = normalizeCategory(updateData.category);
      if (!normalizedCategory) {
        return NextResponse.json({
          error: 'Invalid category. Must be one of: ring, earring, bracelet, necklace (singular forms only)'
        }, { status: 400 })
      }
      updateData.category = normalizedCategory;
    }

    if (updateData.price !== undefined && (typeof updateData.price !== 'number' || updateData.price < 0)) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
    }

    // Only validate images if they're being updated
    if (updateData.images !== undefined) {
      if (!Array.isArray(updateData.images) || updateData.images.length === 0) {
        return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
      }
    }

    // Validate units if provided
    if (updateData.units && Array.isArray(updateData.units) && updateData.units.length > 0) {
      for (let i = 0; i < updateData.units.length; i++) {
        const unit = updateData.units[i]
        if (!unit.unitId?.trim()) {
          return NextResponse.json({ error: `Unit ID is required for unit ${i + 1}` }, { status: 400 })
        }
        if (typeof unit.price !== 'number' || unit.price < 0) {
          return NextResponse.json({ error: `Valid price is required for unit ${i + 1}` }, { status: 400 })
        }
        if (typeof unit.stock !== 'number' || unit.stock < 0) {
          return NextResponse.json({ error: `Valid stock is required for unit ${i + 1}` }, { status: 400 })
        }
      }
    } else if (updateData.stock !== undefined && (typeof updateData.stock !== 'number' || updateData.stock < 0)) {
      // Only validate stock if no units and stock is being updated
      return NextResponse.json({ error: 'Valid stock is required' }, { status: 400 })
    }

    // Check if product exists
    const existingProduct = await Product.findById(productId)
    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    console.log('Existing product found:', existingProduct.name)

    // Clean up the update data - remove any undefined or null values
    const cleanUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value
      }
      return acc
    }, {} as any)

    console.log('Clean update data:', JSON.stringify(cleanUpdateData, null, 2))

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: cleanUpdateData },
      {
        new: true,
        runValidators: true
      }
    )

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    console.log('Product updated successfully:', updatedProduct.name)

    return NextResponse.json({
      message: 'Product updated successfully',
      product: updatedProduct
    })

  } catch (error: any) {
    console.error('Error updating product:', error)
    console.error('Error stack:', error.stack)

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message)
      console.error('Validation errors:', validationErrors)
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 })
    }

    if (error.name === 'CastError') {
      console.error('Cast error:', error.message)
      return NextResponse.json({
        error: 'Invalid data format',
        details: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to update product',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAccess = await isAdmin()
  if (!adminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await dbConnect()

    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    }

    const deletedProduct = await Product.findByIdAndDelete(id)

    if (!deletedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}