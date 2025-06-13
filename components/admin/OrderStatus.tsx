'use client'

interface OrderStatusProps {
    status: string
    paymentStatus: string
    total: number
    isPriceAdjusted?: boolean
    orderNumber: string
    createdAt: string
}

export default function OrderStatus({
    status,
    paymentStatus,
    total,
    isPriceAdjusted,
    orderNumber,
    createdAt
}: OrderStatusProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'approved': return 'bg-green-100 text-green-800 border-green-200'
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
            case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'pending_payment_adjustment': return 'bg-orange-100 text-orange-800 border-orange-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getPaymentStatusColor = (status: string) => {
        const colors = {
            'captured': 'text-green-600',
            'succeeded': 'text-green-600',
            'failed': 'text-red-600',
            'pending': 'text-gray-700',
            'pending_approval': 'text-gray-700',
            'pending_adjustment': 'text-gray-700',
            'cancelled': 'text-gray-700'
        }
        return colors[status as keyof typeof colors] || 'text-gray-700'
    }

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Status</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Order {orderNumber} • {new Date(createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-4">
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(status)}`}>
                            {status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">
                            Payment: <span className={`font-medium ${getPaymentStatusColor(paymentStatus)}`}>
                                {paymentStatus.replace(/_/g, ' ')}
                            </span>
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                        ${total.toFixed(2)}
                    </div>
                    {isPriceAdjusted && (
                        <span className="text-sm text-orange-600 font-medium">
                            Price Adjusted
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
