'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
}

export default function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-lg"></div>
            <div className="mt-4 bg-gray-200 h-4 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {categories.map((category) => (
        <Link
          key={category._id}
          href={`/products?category=${category.slug}`}
          className="group cursor-pointer"
        >
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 group-hover:shadow-lg transition-shadow">
            <Image
              src={category.image || '/placeholder-category.jpg'}
              alt={category.name}
              width={300}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
          )}
        </Link>
      ))}
    </div>
  )
}
