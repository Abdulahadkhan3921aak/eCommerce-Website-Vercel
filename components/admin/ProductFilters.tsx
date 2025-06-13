'use client'

interface ProductFiltersProps {
    filterCategory: string
    filterSize: string
    filterColor: string
    filterStockStatus: string
    filterPriceMin: string
    filterPriceMax: string
    sortBy: string
    allCategories: string[]
    allSizes: string[]
    allColors: string[]
    onFilterChange: (field: string, value: string) => void
    onClearFilters: () => void
}

export default function ProductFilters({
    filterCategory,
    filterSize,
    filterColor,
    filterStockStatus,
    filterPriceMin,
    filterPriceMax,
    sortBy,
    allCategories,
    allSizes,
    allColors,
    onFilterChange,
    onClearFilters
}: ProductFiltersProps) {
    return (
        <div className="p-3 sm:p-4 bg-white shadow sm:rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-base sm:text-lg font-medium text-gray-900">Filters</h2>
                <button
                    onClick={onClearFilters}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                    Clear All Filters
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                {/* Category Filter */}
                <div>
                    <label htmlFor="filterCategory" className="block text-sm font-medium text-gray-700">
                        Category
                    </label>
                    <select
                        id="filterCategory"
                        value={filterCategory}
                        onChange={(e) => onFilterChange('category', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                    >
                        <option value="">All Categories</option>
                        {allCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Size Filter */}
                <div>
                    <label htmlFor="filterSize" className="block text-sm font-medium text-gray-700">
                        Size
                    </label>
                    <select
                        id="filterSize"
                        value={filterSize}
                        onChange={(e) => onFilterChange('size', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                    >
                        <option value="">All Sizes</option>
                        {allSizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                {/* Color Filter */}
                <div>
                    <label htmlFor="filterColor" className="block text-sm font-medium text-gray-700">
                        Color
                    </label>
                    <select
                        id="filterColor"
                        value={filterColor}
                        onChange={(e) => onFilterChange('color', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                    >
                        <option value="">All Colors</option>
                        {allColors.map(color => (
                            <option key={color} value={color}>{color}</option>
                        ))}
                    </select>
                </div>

                {/* Stock Status Filter */}
                <div>
                    <label htmlFor="filterStockStatus" className="block text-sm font-medium text-gray-700">
                        Stock Status
                    </label>
                    <select
                        id="filterStockStatus"
                        value={filterStockStatus}
                        onChange={(e) => onFilterChange('stockStatus', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                    >
                        <option value="">All Stock Levels</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock (≤5)</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                </div>

                {/* Price Range */}
                <div>
                    <label htmlFor="filterPriceMin" className="block text-sm font-medium text-gray-700">
                        Min Price
                    </label>
                    <input
                        type="number"
                        id="filterPriceMin"
                        value={filterPriceMin}
                        onChange={(e) => onFilterChange('priceMin', e.target.value)}
                        placeholder="Min"
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                    />
                </div>

                <div>
                    <label htmlFor="filterPriceMax" className="block text-sm font-medium text-gray-700">
                        Max Price
                    </label>
                    <input
                        type="number"
                        id="filterPriceMax"
                        value={filterPriceMax}
                        onChange={(e) => onFilterChange('priceMax', e.target.value)}
                        placeholder="Max"
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900"
                    />
                </div>
            </div>

            {/* Sort Options */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Sort by:</label>
                    <select
                        value={sortBy}
                        onChange={(e) => onFilterChange('sortBy', e.target.value)}
                        className="pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 rounded-md text-gray-900"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name_asc">Name A-Z</option>
                        <option value="name_desc">Name Z-A</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                        <option value="stock_low">Stock: Low to High</option>
                        <option value="stock_high">Stock: High to Low</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
