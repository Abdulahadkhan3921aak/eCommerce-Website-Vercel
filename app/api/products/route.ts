import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { isAdmin } from '@/lib/auth/adminCheck';
import { getProductDisplayPrice } from '@/lib/types/product';

export async function GET(request: NextRequest) {
  try {
    console.log('Products API called with URL:', request.url);

    await dbConnect();
    console.log('Database connected successfully');

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'featured';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '1000');

    console.log('Query parameters:', { category, featured, search, sortBy, page, limit, minPrice, maxPrice });

    // Build query
    let query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Simplify price filter logic
    if (minPrice > 0 || maxPrice < 1000) {
      const priceConditions = [
        // Legacy products without units
        {
          $and: [
            { $or: [{ units: { $exists: false } }, { units: { $size: 0 } }] },
            { price: { $gte: minPrice, $lte: maxPrice } }
          ]
        },
        // Products with units
        {
          $and: [
            { units: { $exists: true, $not: { $size: 0 } } },
            { 'units.price': { $gte: minPrice, $lte: maxPrice } }
          ]
        }
      ];

      if (query.$or) {
        // Combine search and price conditions
        query = {
          $and: [
            { $or: query.$or }, // search conditions
            { $or: priceConditions } // price conditions
          ]
        };
      } else {
        query.$or = priceConditions;
      }
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    // Build sort object
    let sort: any = {};
    switch (sortBy) {
      case 'price-low':
        sort = { price: 1 };
        break;
      case 'price-high':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { rating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      default:
        sort = { featured: -1, createdAt: -1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalCount = await Product.countDocuments(query);
    console.log('Total products matching query:', totalCount);

    // Get paginated products
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    console.log(`Found ${totalCount} total products, returning page ${page} with ${products.length} items`);

    // Process products to ensure proper pricing and stock
    const processedProducts = products.map(product => {
      // Log product structure for debugging
      console.log('Processing product:', product.name, {
        images: product.images?.length || 0,
        units: product.units?.length || 0,
        unitImages: product.units?.map(unit => ({
          unitId: unit.unitId,
          images: unit.images?.length || 0,
          firstImage: unit.images?.[0]
        }))
      });

      // Ensure required fields exist
      if (typeof product.featured === 'undefined') {
        product.featured = false;
      }

      if (typeof product.price !== 'number') {
        product.price = 0;
      }

      if (!product.name) {
        product.name = 'Unnamed Product';
      }

      if (!product.images || !Array.isArray(product.images)) {
        product.images = [];
      }

      // Clean up image URLs at product level
      product.images = product.images.filter(img =>
        img && typeof img === 'string' && img.trim().length > 0
      );

      // Clean up unit images if units exist
      if (product.units && Array.isArray(product.units)) {
        product.units = product.units.map(unit => {
          if (unit.images && Array.isArray(unit.images)) {
            unit.images = unit.images.filter(img =>
              img && typeof img === 'string' && img.trim().length > 0
            );
          } else {
            unit.images = [];
          }
          return unit;
        });
      }

      // Ensure stock fields are properly set
      if (!product.totalStock && product.units && product.units.length > 0) {
        product.totalStock = product.units.reduce((sum, unit) => sum + (unit.stock || 0), 0);
      } else if (!product.totalStock) {
        product.totalStock = product.stock || 0;
      }

      // For products without units (legacy products)
      if (!product.units || product.units.length === 0) {
        // Calculate sale price if on sale and valid configuration exists
        if (product.saleConfig?.isOnSale &&
          product.saleConfig.saleType &&
          typeof product.saleConfig.saleValue === 'number' &&
          !isNaN(product.saleConfig.saleValue) &&
          product.saleConfig.saleValue > 0) {

          let salePrice = product.price;

          if (product.saleConfig.saleType === 'percentage' && product.saleConfig.saleValue <= 100) {
            salePrice = product.price * (1 - product.saleConfig.saleValue / 100);
          } else if (product.saleConfig.saleType === 'amount') {
            salePrice = product.price - product.saleConfig.saleValue;
          }

          // Ensure sale price is valid and not negative
          if (!isNaN(salePrice) && salePrice >= 0 && salePrice < product.price) {
            product.salePrice = parseFloat(salePrice.toFixed(2));
          } else {
            // If calculation results in invalid price, remove sale price
            delete product.salePrice;
          }
        } else {
          // Remove any existing sale price if not properly configured
          delete product.salePrice;
        }
      }

      return product;
    });

    const response = {
      products: processedProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };

    console.log('Sending response with', processedProducts.length, 'products');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in products API:', error);
    return NextResponse.json({
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error',
      products: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { status: 500 });
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
    // Remove slug requirement since it's auto-generated
    if (!body.name || !body.description || !body.price || !body.category) {
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
