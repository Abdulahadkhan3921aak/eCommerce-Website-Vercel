import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { isAdmin } from '@/lib/auth/adminCheck';

export async function GET(request: NextRequest) {
    try {
        const adminAccess = await isAdmin();
        if (!adminAccess) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const size = searchParams.get('size');
        const color = searchParams.get('color');
        const stockStatus = searchParams.get('stockStatus');
        const sortBy = searchParams.get('sortBy') || 'newest';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const minPrice = parseFloat(searchParams.get('minPrice') || '0');
        const maxPrice = parseFloat(searchParams.get('maxPrice') || '10000');

        // Build MongoDB aggregation pipeline for better performance
        const pipeline: any[] = [];

        // Match stage - build query conditions
        const matchConditions: any = {};

        // Search filter
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            matchConditions.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { 'units.size': searchRegex },
                { 'units.color': searchRegex }
            ];
        }

        // Category filter
        if (category && category !== 'all') {
            matchConditions.category = category;
        }

        // Size filter
        if (size) {
            matchConditions.$or = matchConditions.$or || [];
            matchConditions.$or.push(
                { sizes: size },
                { 'units.size': size }
            );
        }

        // Color filter
        if (color) {
            const colorConditions = [
                { colors: color },
                { 'units.color': color }
            ];
            if (matchConditions.$or) {
                matchConditions.$and = [
                    { $or: matchConditions.$or },
                    { $or: colorConditions }
                ];
                delete matchConditions.$or;
            } else {
                matchConditions.$or = colorConditions;
            }
        }

        // Price filter using aggregation
        if (minPrice > 0 || maxPrice < 10000) {
            const priceConditions = [
                // Products without units
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

            if (matchConditions.$and) {
                matchConditions.$and.push({ $or: priceConditions });
            } else if (matchConditions.$or) {
                matchConditions.$and = [
                    { $or: matchConditions.$or },
                    { $or: priceConditions }
                ];
                delete matchConditions.$or;
            } else {
                matchConditions.$or = priceConditions;
            }
        }

        pipeline.push({ $match: matchConditions });

        // Add calculated fields for sorting and filtering - Fixed syntax
        pipeline.push({
            $addFields: {
                totalStock: {
                    $cond: {
                        if: { $and: [{ $ne: ["$units", null] }, { $gt: [{ $size: { $ifNull: ["$units", []] } }, 0] }] },
                        then: { $sum: { $ifNull: ["$units.stock", []] } },
                        else: { $ifNull: ["$stock", 0] }
                    }
                },
                displayPrice: {
                    $cond: {
                        if: { $and: [{ $ne: ["$units", null] }, { $gt: [{ $size: { $ifNull: ["$units", []] } }, 0] }] },
                        then: { $min: { $ifNull: ["$units.price", []] } },
                        else: { $ifNull: ["$price", 0] }
                    }
                }
            }
        });

        // Stock status filter (after calculating totalStock)
        if (stockStatus) {
            const stockConditions: any = {};
            switch (stockStatus) {
                case 'in_stock':
                    stockConditions.totalStock = { $gt: 5 };
                    break;
                case 'low_stock':
                    stockConditions.totalStock = { $gt: 0, $lte: 5 };
                    break;
                case 'out_of_stock':
                    stockConditions.totalStock = { $eq: 0 };
                    break;
            }
            if (Object.keys(stockConditions).length > 0) {
                pipeline.push({ $match: stockConditions });
            }
        }

        // Get total count for pagination
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await Product.aggregate(countPipeline);
        const totalCount = countResult[0]?.total || 0;

        // Sort stage
        let sortStage: any = {};
        switch (sortBy) {
            case 'newest':
                sortStage = { createdAt: -1 };
                break;
            case 'oldest':
                sortStage = { createdAt: 1 };
                break;
            case 'name_asc':
                sortStage = { name: 1 };
                break;
            case 'name_desc':
                sortStage = { name: -1 };
                break;
            case 'price_low':
                sortStage = { displayPrice: 1 };
                break;
            case 'price_high':
                sortStage = { displayPrice: -1 };
                break;
            case 'stock_low':
                sortStage = { totalStock: 1 };
                break;
            case 'stock_high':
                sortStage = { totalStock: -1 };
                break;
            default:
                sortStage = { createdAt: -1 };
        }
        pipeline.push({ $sort: sortStage });

        // Pagination
        const skip = (page - 1) * limit;
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });

        // Execute main query
        const products = await Product.aggregate(pipeline);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);

        // Get filter options efficiently (cache this in production)
        let filterOptions = { categories: [], sizes: [], colors: [] };

        // Only fetch filter options if it's the first page or no filters applied
        // This reduces the load time significantly
        if (page === 1 && !search && !category && !size && !color && !stockStatus) {
            try {
                const filterPipeline = [
                    {
                        $group: {
                            _id: null,
                            categories: { $addToSet: "$category" },
                            productSizes: { $addToSet: "$sizes" },
                            productColors: { $addToSet: "$colors" },
                            unitSizes: { $addToSet: "$units.size" },
                            unitColors: { $addToSet: "$units.color" }
                        }
                    },
                    {
                        $project: {
                            categories: { $filter: { input: "$categories", cond: { $ne: ["$$this", null] } } },
                            allSizes: {
                                $setUnion: [
                                    { $reduce: { input: { $ifNull: ["$productSizes", []] }, initialValue: [], in: { $concatArrays: ["$$value", { $ifNull: ["$$this", []] }] } } },
                                    { $reduce: { input: { $ifNull: ["$unitSizes", []] }, initialValue: [], in: { $concatArrays: ["$$value", { $ifNull: ["$$this", []] }] } } }
                                ]
                            },
                            allColors: {
                                $setUnion: [
                                    { $reduce: { input: { $ifNull: ["$productColors", []] }, initialValue: [], in: { $concatArrays: ["$$value", { $ifNull: ["$$this", []] }] } } },
                                    { $reduce: { input: { $ifNull: ["$unitColors", []] }, initialValue: [], in: { $concatArrays: ["$$value", { $ifNull: ["$$this", []] }] } } }
                                ]
                            }
                        }
                    }
                ];

                const filterResult = await Product.aggregate(filterPipeline);
                if (filterResult[0]) {
                    filterOptions = {
                        categories: (filterResult[0].categories || []).filter(Boolean).sort(),
                        sizes: (filterResult[0].allSizes || []).filter(Boolean).sort(),
                        colors: (filterResult[0].allColors || []).filter(Boolean).sort()
                    };
                }
            } catch (filterError) {
                console.warn('Failed to fetch filter options, using fallback:', filterError);
                // Fallback to simple method
                const allProducts = await Product.find({}, { category: 1, sizes: 1, colors: 1, 'units.size': 1, 'units.color': 1 }).lean();
                const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
                const sizes = [...new Set([
                    ...allProducts.flatMap(p => p.sizes || []),
                    ...allProducts.flatMap(p => p.units?.map(u => u.size) || [])
                ].filter(Boolean))];
                const colors = [...new Set([
                    ...allProducts.flatMap(p => p.colors || []),
                    ...allProducts.flatMap(p => p.units?.map(u => u.color) || [])
                ].filter(Boolean))];

                filterOptions = {
                    categories: categories.sort(),
                    sizes: sizes.sort(),
                    colors: colors.sort()
                };
            }
        }

        const response = {
            products: products,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filterOptions
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in admin products API:', error);
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
            },
            filterOptions: {
                categories: [],
                sizes: [],
                colors: []
            }
        }, { status: 500 });
    }
}
