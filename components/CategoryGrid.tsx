'use client'

import Image from 'next/image'
import Link from 'next/link'

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
}

interface CategoryGridProps {
  categories: Category[]
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
      {categories.map((category) => (
        <Link key={category._id} href={`/categories/${category.slug}`}>
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-32 sm:h-40">
              <Image
                src={category.image || '/placeholder-category.jpg'}
                alt={category.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-3 sm:p-4 text-center">
              <h3 className="font-semibold text-sm sm:text-lg">{category.name}</h3>
              {category.description && (
                <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">{category.description}</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
