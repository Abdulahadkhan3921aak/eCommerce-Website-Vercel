import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/adminCheck'
import connectToDatabase from '@/lib/mongodb'
import Product from '@/lib/models/Product'

export async function POST(req: NextRequest) {
    try {
        // Use the same admin check pattern as other routes
        const adminAccess = await isAdmin()
        if (!adminAccess) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await connectToDatabase()

        const { productIds, saleConfig } = await req.json()

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 })
        }

        if (!saleConfig || !saleConfig.action) {
            return NextResponse.json({ error: 'Sale configuration is required' }, { status: 400 })
        }

        let updateData: any = {}

        if (saleConfig.action === 'setSale') {
            if (!saleConfig.type || typeof saleConfig.value !== 'number') {
                return NextResponse.json({ error: 'Valid sale type and value are required' }, { status: 400 })
            }
            updateData.saleConfig = {
                isOnSale: true,
                saleType: saleConfig.type,
                saleValue: saleConfig.value,
            }
            updateData.$unset = { salePrice: "" }
        } else if (saleConfig.action === 'removeSale') {
            updateData.saleConfig = {
                isOnSale: false,
                saleType: 'percentage',
                saleValue: 0,
            }
            updateData.$unset = { salePrice: "" }
        }

        console.log('Bulk sale update data:', { productIds, updateData })

        const result = await Product.updateMany(
            { _id: { $in: productIds } },
            updateData
        )

        console.log('Bulk sale update result:', result)

        return NextResponse.json({
            message: 'Bulk sale update successful',
            modifiedCount: result.modifiedCount,
        })
    } catch (error: any) {
        console.error('Bulk sale update error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
