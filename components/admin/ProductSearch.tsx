'use client'

import { useState } from 'react'

interface ProductSearchProps {
    searchQuery: string
    onSearchQueryChange: (query: string) => void
    onSearch: () => void
    onClearSearch: () => void
    searchLoading: boolean
    activeSearchQuery: string
}

export default function ProductSearch({
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onClearSearch,
    searchLoading,
    activeSearchQuery
}: ProductSearchProps) {
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch()
        }
    }

    return (
        <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search products by name, description, unit size, or color..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    />
                    <svg
                        className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
                <button
                    onClick={onSearch}
                    disabled={searchLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                >
                    {searchLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        </div>
                    ) : (
                        'Search'
                    )}
                </button>
                {(searchQuery || activeSearchQuery) && (
                    <button
                        onClick={onClearSearch}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition duration-150 ease-in-out"
                    >
                        Clear
                    </button>
                )}
            </div>
            {activeSearchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                    Searching for: <span className="font-medium text-purple-600">"{activeSearchQuery}"</span>
                </div>
            )}
        </div>
    )
}
