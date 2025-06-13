'use client'

interface ProductBulkActionsProps {
    selectedCount: number
    bulkAction: string
    saleType: 'percentage' | 'amount'
    bulkValue: string
    bulkLoading: boolean
    onBulkActionChange: (action: string) => void
    onSaleTypeChange: (type: 'percentage' | 'amount') => void
    onBulkValueChange: (value: string) => void
    onApplyBulkAction: () => void
}

export default function ProductBulkActions({
    selectedCount,
    bulkAction,
    saleType,
    bulkValue,
    bulkLoading,
    onBulkActionChange,
    onSaleTypeChange,
    onBulkValueChange,
    onApplyBulkAction
}: ProductBulkActionsProps) {
    if (selectedCount === 0) return null

    return (
        <div className="p-3 sm:p-4 bg-white shadow sm:rounded-lg border border-gray-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3">
                Bulk Actions ({selectedCount} selected)
            </h2>
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:items-end">
                <div>
                    <label htmlFor="bulkAction" className="block text-sm font-medium text-gray-700">
                        Action
                    </label>
                    <select
                        id="bulkAction"
                        value={bulkAction}
                        onChange={(e) => onBulkActionChange(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                    >
                        <option value="">Select Action</option>
                        <option value="setPrice">Set New Price</option>
                        <option value="setSale">Apply Sale</option>
                        <option value="removeSale">Remove Sale</option>
                        <option value="setTax">Set Tax Percentage</option>
                    </select>
                </div>

                {bulkAction === 'setSale' && (
                    <div>
                        <label htmlFor="saleType" className="block text-sm font-medium text-gray-700">
                            Sale Type
                        </label>
                        <select
                            id="saleType"
                            value={saleType}
                            onChange={(e) => onSaleTypeChange(e.target.value as 'percentage' | 'amount')}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                        >
                            <option value="percentage">Percentage (%)</option>
                            <option value="amount">Fixed Amount ($)</option>
                        </select>
                    </div>
                )}

                {(bulkAction === 'setPrice' || bulkAction === 'setSale' || bulkAction === 'setTax') && (
                    <div>
                        <label htmlFor="bulkValue" className="block text-sm font-medium text-gray-700">
                            {bulkAction === 'setSale'
                                ? `${saleType === 'percentage' ? 'Percentage' : 'Amount'}`
                                : bulkAction === 'setTax'
                                    ? 'Tax Percentage'
                                    : 'Price'}
                        </label>
                        <input
                            type="number"
                            id="bulkValue"
                            value={bulkValue}
                            onChange={(e) => onBulkValueChange(e.target.value)}
                            placeholder={
                                bulkAction === 'setSale'
                                    ? saleType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'
                                    : bulkAction === 'setTax'
                                        ? 'e.g., 8.5'
                                        : 'Enter price'
                            }
                            min={bulkAction === 'setTax' ? '0' : undefined}
                            max={bulkAction === 'setTax' ? '100' : undefined}
                            step={bulkAction === 'setTax' ? '0.1' : undefined}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                        />
                    </div>
                )}

                <div className="sm:col-span-2 lg:col-span-1">
                    <button
                        onClick={onApplyBulkAction}
                        disabled={
                            bulkLoading ||
                            !bulkAction ||
                            ((bulkAction === 'setPrice' || bulkAction === 'setSale' || bulkAction === 'setTax') && bulkValue === '')
                        }
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {bulkLoading ? 'Applying...' : 'Apply to Selected'}
                    </button>
                </div>
            </div>
        </div>
    )
}
