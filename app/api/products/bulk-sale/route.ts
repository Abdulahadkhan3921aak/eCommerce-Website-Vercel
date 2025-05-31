import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import connectToDatabase from '@/lib/mongodb'
import Product from '@/lib/models/Product'
import { currentUser } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin (you may want to add proper role checking)
        const user = await currentUser()
        const userRole = user?.privateMetadata?.role as string
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        await connectToDatabase()

        const { productIds, saleConfig } = await req.json()

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 })
        }

        const updateData: any = {}

        if (saleConfig.action === 'setSale') {
            updateData.saleConfig = {
                isOnSale: true,
                saleType: saleConfig.type, // 'percentage' or 'amount'
                saleValue: saleConfig.value,
            }
        } else if (saleConfig.action === 'removeSale') {
            updateData.saleConfig = {
                isOnSale: false,
                saleType: 'percentage',
                saleValue: 0,
            }
            updateData.salePrice = undefined
        }

        const result = await Product.updateMany(
            { _id: { $in: productIds } },
            updateData
        )

        return NextResponse.json({
            message: 'Bulk sale update successful',
            modifiedCount: result.modifiedCount,
        })
    } catch (error: any) {
        console.error('Bulk sale update error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
