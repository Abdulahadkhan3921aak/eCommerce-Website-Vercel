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

        const { productIds, action } = await req.json()

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json({ error: 'Product IDs are required' }, { status: 400 })
        }

        if (!action || !action.type) {
            return NextResponse.json({ error: 'Action type is required' }, { status: 400 })
        }

        let updateData: any = {}

        if (action.type === 'setPrice') {
            if (typeof action.value !== 'number' || action.value < 0) {
                return NextResponse.json({ error: 'Valid price value is required' }, { status: 400 })
            }
            updateData.price = action.value
        }

        console.log('Bulk update data:', { productIds, updateData })

        const result = await Product.updateMany(
            { _id: { $in: productIds } },
            { $set: updateData }
        )

        console.log('Bulk update result:', result)

        return NextResponse.json({
            message: 'Bulk update successful',
            modifiedCount: result.modifiedCount,
        })
    } catch (error: any) {
        console.error('Bulk update error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
