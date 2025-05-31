import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { isAdmin } from '@/lib/auth/adminCheck'; // Import admin check

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const limitParam = searchParams.get('limit');
    
    let query: any = {};
    
    if (category) {
      query = { category };
    }
    
    if (featured === 'true') {
      query = { ...query, featured: true };
    }
    
    let productsQuery = Product.find(query).sort({ createdAt: -1 });
    
    if (limitParam) {
      const limit = parseInt(limitParam);
      if (!isNaN(limit) && limit > 0) {
        productsQuery = productsQuery.limit(limit);
      }
    }
    
    const products = await productsQuery;
    
    // Calculate effective price for each product
    const productsWithEffectivePrice = products.map(product => {
      const productObj = product.toObject();
      
      // Calculate sale price if on sale
      if (productObj.saleConfig?.isOnSale) {
        let salePrice = productObj.price;
        
        if (productObj.saleConfig.saleType === 'percentage') {
          salePrice = productObj.price * (1 - productObj.saleConfig.saleValue / 100);
        } else if (productObj.saleConfig.saleType === 'amount') {
          salePrice = productObj.price - productObj.saleConfig.saleValue;
        }
        
        // Ensure sale price is not negative
        salePrice = Math.max(0, salePrice);
        productObj.salePrice = parseFloat(salePrice.toFixed(2));
        productObj.effectivePrice = productObj.salePrice;
      } else {
        productObj.effectivePrice = productObj.price;
      }
      
      return productObj;
    });

    return NextResponse.json(productsWithEffectivePrice);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminAccess = await isAdmin();
  if (!adminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    const body = await request.json();
    // Basic validation or transformation can happen here
    if (!body.name || !body.description || !body.price || !body.category || !body.slug) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = new Product(body);
    await product.save();
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if (error.code === 11000) { // Mongoose duplicate key error
        return NextResponse.json({ error: 'Product with this slug already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
