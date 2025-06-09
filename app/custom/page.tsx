'use client'

import { useState } from 'react'
import Image from 'next/image'
import Header from '@/components/Header'
import { useCart } from '@/lib/contexts/CartContext'
import { Product } from '@/models/Product'

type JewelryCategory = 'ring' | 'necklace' | 'earring' | 'bracelet'

interface SizeOption {
  id: string
  name: string
  displayName: string
  inches: string
  centimeters: string
  description?: string
}

const categorySizes: Record<JewelryCategory, SizeOption[]> = {
  ring: [
    { id: 'ring-4', name: '4', displayName: 'Size 4', inches: '0.58"', centimeters: '1.47 cm', description: 'Extra Small' },
    { id: 'ring-5', name: '5', displayName: 'Size 5', inches: '0.62"', centimeters: '1.57 cm', description: 'Small' },
    { id: 'ring-6', name: '6', displayName: 'Size 6', inches: '0.65"', centimeters: '1.65 cm', description: 'Medium Small' },
    { id: 'ring-7', name: '7', displayName: 'Size 7', inches: '0.69"', centimeters: '1.75 cm', description: 'Medium' },
    { id: 'ring-8', name: '8', displayName: 'Size 8', inches: '0.72"', centimeters: '1.83 cm', description: 'Medium Large' },
    { id: 'ring-9', name: '9', displayName: 'Size 9', inches: '0.76"', centimeters: '1.93 cm', description: 'Large' },
    { id: 'ring-10', name: '10', displayName: 'Size 10', inches: '0.80"', centimeters: '2.03 cm', description: 'Extra Large' }
  ],
  necklace: [
    { id: 'necklace-14', name: '14', displayName: '14"', inches: '14"', centimeters: '35.6 cm', description: 'Choker' },
    { id: 'necklace-16', name: '16', displayName: '16"', inches: '16"', centimeters: '40.6 cm', description: 'Short' },
    { id: 'necklace-18', name: '18', displayName: '18"', inches: '18"', centimeters: '45.7 cm', description: 'Standard' },
    { id: 'necklace-20', name: '20', displayName: '20"', inches: '20"', centimeters: '50.8 cm', description: 'Medium' },
    { id: 'necklace-22', name: '22', displayName: '22"', inches: '22"', centimeters: '55.9 cm', description: 'Long' },
    { id: 'necklace-24', name: '24', displayName: '24"', inches: '24"', centimeters: '61.0 cm', description: 'Extra Long' }
  ],
  earring: [
    { id: 'earring-small', name: 'small', displayName: 'Small', inches: '0.5"', centimeters: '1.3 cm', description: 'Delicate & Subtle' },
    { id: 'earring-medium', name: 'medium', displayName: 'Medium', inches: '1"', centimeters: '2.5 cm', description: 'Classic Size' },
    { id: 'earring-large', name: 'large', displayName: 'Large', inches: '1.5"', centimeters: '3.8 cm', description: 'Statement Piece' }
  ],
  bracelet: [
    { id: 'bracelet-xs', name: 'xs', displayName: 'XS', inches: '6"', centimeters: '15.2 cm', description: 'Extra Small Wrist' },
    { id: 'bracelet-s', name: 's', displayName: 'S', inches: '6.5"', centimeters: '16.5 cm', description: 'Small Wrist' },
    { id: 'bracelet-m', name: 'm', displayName: 'M', inches: '7"', centimeters: '17.8 cm', description: 'Medium Wrist' },
    { id: 'bracelet-l', name: 'l', displayName: 'L', inches: '7.5"', centimeters: '19.1 cm', description: 'Large Wrist' },
    { id: 'bracelet-xl', name: 'xl', displayName: 'XL', inches: '8"', centimeters: '20.3 cm', description: 'Extra Large Wrist' }
  ]
}

const categoryInfo = {
  ring: {
    title: 'Custom Ring',
    description: 'Create your perfect ring with personalized engravings and custom sizing',
    basePrice: 49.99,
    image: '/images/custom-ring.jpg'
  },
  necklace: {
    title: 'Custom Necklace',
    description: 'Design a beautiful necklace with your choice of length and personalization',
    basePrice: 59.99,
    image: '/images/custom-necklace.jpg'
  },
  earring: {
    title: 'Custom Earrings',
    description: 'Handcrafted earrings tailored to your style and preferences',
    basePrice: 39.99,
    image: '/images/custom-earrings.jpg'
  },
  bracelet: {
    title: 'Custom Bracelet',
    description: 'Personalized bracelet with optional name engraving',
    basePrice: 44.99,
    image: '/images/custom-bracelet.jpg'
  }
}

export default function CustomProductPage() {
  const [selectedCategory, setSelectedCategory] = useState<JewelryCategory | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [allowMultipleSizes, setAllowMultipleSizes] = useState(false)
  const [engraveName, setEngraveName] = useState('')
  const [engraveEnabled, setEngraveEnabled] = useState(false)
  const [customText, setCustomText] = useState('')
  const [quantity, setQuantity] = useState(1)

  const { addToCart } = useCart()

  const handleCategorySelect = (category: JewelryCategory) => {
    setSelectedCategory(category)
    setSelectedSizes([])
    setEngraveName('')
    setEngraveEnabled(false)
    setCustomText('')
    setAllowMultipleSizes(false)
  }

  const handleSizeSelect = (sizeId: string) => {
    if (allowMultipleSizes) {
      setSelectedSizes(prev =>
        prev.includes(sizeId)
          ? prev.filter(id => id !== sizeId)
          : [...prev, sizeId]
      )
    } else {
      setSelectedSizes([sizeId])
    }
  }

  const calculatePrice = () => {
    if (!selectedCategory) return 0

    let price = categoryInfo[selectedCategory].basePrice

    // Add cost for multiple sizes
    if (selectedSizes.length > 1) {
      price += (selectedSizes.length - 1) * 10
    }

    // Add engraving cost
    if (engraveEnabled && (engraveName || customText)) {
      price += 15
    }

    return price * quantity
  }

  const handleAddToCart = () => {
    if (!selectedCategory || selectedSizes.length === 0) {
      alert('Please select a category and size')
      return
    }

    if (selectedCategory === 'bracelet' && engraveEnabled && !engraveName) {
      alert('Please enter a name for engraving')
      return
    }

    const selectedSizeNames = selectedSizes.map(sizeId => {
      const size = categorySizes[selectedCategory].find(s => s.id === sizeId)
      return size?.displayName || sizeId
    }).join(', ')

    const customProduct: Product = {
      _id: `custom-${selectedCategory}-${Date.now()}`,
      name: `${categoryInfo[selectedCategory].title}${engraveEnabled ? ' (Engraved)' : ''}`,
      description: `Custom ${categoryInfo[selectedCategory].title}`,
      price: calculatePrice(),
      images: [categoryInfo[selectedCategory].image],
      category: 'custom',
      stock: 999, // Custom products have high stock
      totalStock: 999,
      featured: false,
      rating: 5,
      reviews: 0,
      customization: {
        category: selectedCategory,
        sizes: selectedSizeNames,
        engraving: engraveEnabled ? (engraveName || customText) : null,
        quantity
      },
      // Add units structure for custom products
      units: selectedSizes.map(sizeId => ({
        unitId: `custom-unit-${sizeId}-${Date.now()}`,
        size: categorySizes[selectedCategory].find(s => s.id === sizeId)?.displayName,
        stock: 999,
        price: calculatePrice(),
        images: [categoryInfo[selectedCategory].image], // Use category image for custom units
        saleConfig: {
          isOnSale: false,
          saleType: 'percentage' as const,
          saleValue: 0
        }
      }))
    }

    addToCart(customProduct, 1)
    alert('Custom jewelry added to cart!')
  }

  const getRingSizeVisual = (size: SizeOption, isSelected: boolean) => (
    <div
      key={size.id}
      className={`relative cursor-pointer transition-all duration-200 ${isSelected ? 'transform scale-110' : 'hover:scale-105'
        }`}
      onClick={() => handleSizeSelect(size.id)}
    >
      <div
        className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-colors ${isSelected
          ? 'border-purple-600 bg-purple-50'
          : 'border-gray-300 hover:border-purple-400'
          }`}
        style={{
          transform: `scale(${0.6 + (parseInt(size.name) - 4) * 0.1})`
        }}
      >
        <span className={`text-xs font-bold ${isSelected ? 'text-purple-600' : 'text-gray-600'}`}>
          {size.name}
        </span>
      </div>
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-xs text-gray-600">{size.inches}</div>
        <div className="text-xs text-gray-500">{size.centimeters}</div>
      </div>
    </div>
  )

  const getNecklaceSizeVisual = (size: SizeOption, isSelected: boolean) => (
    <div
      key={size.id}
      className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${isSelected
        ? 'border-purple-600 bg-purple-50'
        : 'border-gray-200 hover:border-purple-300'
        }`}
      onClick={() => handleSizeSelect(size.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`font-medium ${isSelected ? 'text-purple-600' : 'text-gray-900'}`}>
          {size.displayName}
        </span>
        <span className="text-sm text-gray-500">{size.description}</span>
      </div>
      <div className="flex space-x-4 text-sm text-gray-600">
        <span>{size.inches}</span>
        <span>{size.centimeters}</span>
      </div>
      <div className="mt-2">
        <div
          className={`h-2 rounded-full ${isSelected ? 'bg-purple-200' : 'bg-gray-200'}`}
          style={{ width: `${(parseInt(size.name) / 24) * 100}%` }}
        />
      </div>
    </div>
  )

  const getEarringSizeVisual = (size: SizeOption, isSelected: boolean) => (
    <div
      key={size.id}
      className={`cursor-pointer p-6 border-2 rounded-lg transition-all text-center ${isSelected
        ? 'border-purple-600 bg-purple-50'
        : 'border-gray-200 hover:border-purple-300'
        }`}
      onClick={() => handleSizeSelect(size.id)}
    >
      <div
        className={`w-8 h-8 mx-auto rounded-full border-2 mb-3 ${isSelected ? 'border-purple-600 bg-purple-200' : 'border-gray-400 bg-gray-200'
          }`}
        style={{
          transform: size.name === 'small' ? 'scale(0.7)' : size.name === 'large' ? 'scale(1.3)' : 'scale(1)'
        }}
      />
      <div className={`font-medium mb-1 ${isSelected ? 'text-purple-600' : 'text-gray-900'}`}>
        {size.displayName}
      </div>
      <div className="text-sm text-gray-600">{size.inches} / {size.centimeters}</div>
      <div className="text-xs text-gray-500 mt-1">{size.description}</div>
    </div>
  )

  const getBraceletSizeVisual = (size: SizeOption, isSelected: boolean) => (
    <div
      key={size.id}
      className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${isSelected
        ? 'border-purple-600 bg-purple-50'
        : 'border-gray-200 hover:border-purple-300'
        }`}
      onClick={() => handleSizeSelect(size.id)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`font-bold text-lg ${isSelected ? 'text-purple-600' : 'text-gray-900'}`}>
          {size.displayName}
        </span>
        <span className="text-sm text-gray-500">{size.description}</span>
      </div>
      <div className="flex space-x-4 text-sm text-gray-600 mb-2">
        <span>{size.inches}</span>
        <span>{size.centimeters}</span>
      </div>
      <div
        className={`h-3 rounded-full ${isSelected ? 'bg-purple-200' : 'bg-gray-200'}`}
        style={{
          width: `${60 + (size.name === 'xs' ? 0 : size.name === 's' ? 10 : size.name === 'm' ? 20 : size.name === 'l' ? 30 : 40)}%`,
          maxWidth: '100%'
        }}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Custom Jewelry</h1>
          <p className="text-xl text-gray-600">Design your perfect piece with personalized options</p>
        </div>

        {/* Category Selection */}
        {!selectedCategory && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Choose Your Jewelry Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(categoryInfo).map(([key, info]) => (
                <div
                  key={key}
                  className="card card-hover cursor-pointer p-6 text-center transition-all duration-200 hover:shadow-lg hover:border-purple-200"
                  onClick={() => handleCategorySelect(key as JewelryCategory)}
                >
                  <div className="h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-6xl">
                      {key === 'ring' ? '💍' : key === 'necklace' ? '📿' : key === 'earring' ? '💎' : '📿'}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{info.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{info.description}</p>
                  <div className="text-lg font-bold text-purple-600">From ${info.basePrice}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customization Options */}
        {selectedCategory && (
          <div className="space-y-8">
            {/* Category Header */}
            <div className="text-center">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-purple-600 hover:text-purple-800 mb-4"
              >
                ← Back to Categories
              </button>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {categoryInfo[selectedCategory].title}
              </h2>
              <p className="text-gray-600">{categoryInfo[selectedCategory].description}</p>
            </div>

            {/* Multiple Sizes Option */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={allowMultipleSizes}
                  onChange={(e) => {
                    setAllowMultipleSizes(e.target.checked)
                    if (!e.target.checked) {
                      setSelectedSizes(selectedSizes.slice(0, 1))
                    }
                  }}
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-gray-900 font-medium">
                  Order multiple sizes (+$10 per additional size)
                </span>
              </label>
            </div>

            {/* Size Selection */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Select Size{allowMultipleSizes ? 's' : ''}
              </h3>

              {selectedCategory === 'ring' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap justify-center gap-8 py-8">
                    {categorySizes.ring.map(size =>
                      getRingSizeVisual(size, selectedSizes.includes(size.id))
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Sizing Note:</strong> Ring sizes are measured by inner diameter.
                      If you're unsure, we recommend visiting a jewelry store for professional sizing
                      or using our printable ring sizer available upon request.
                    </p>
                  </div>
                </div>
              )}

              {selectedCategory === 'necklace' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categorySizes.necklace.map(size =>
                      getNecklaceSizeVisual(size, selectedSizes.includes(size.id))
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Length Guide:</strong> Choker (14") sits at the base of neck,
                      Standard (18") falls just below the collarbone, Medium (20") reaches the chest area.
                      Consider your neckline and personal preference when choosing.
                    </p>
                  </div>
                </div>
              )}

              {selectedCategory === 'earring' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {categorySizes.earring.map(size =>
                      getEarringSizeVisual(size, selectedSizes.includes(size.id))
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Style Note:</strong> Small earrings are perfect for everyday wear,
                      Medium offers classic elegance, and Large makes a bold fashion statement.
                      Consider your face shape and personal style.
                    </p>
                  </div>
                </div>
              )}

              {selectedCategory === 'bracelet' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categorySizes.bracelet.map(size =>
                      getBraceletSizeVisual(size, selectedSizes.includes(size.id))
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Fit Guide:</strong> Measure your wrist with a flexible tape measure
                      and add 0.5-1 inch for comfortable fit. The bracelet should move freely
                      but not slide off your hand.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Engraving Options */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="mb-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={engraveEnabled}
                    onChange={(e) => setEngraveEnabled(e.target.checked)}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-900 font-medium">
                    Add Personalized Engraving (+$15)
                  </span>
                </label>
              </div>

              {engraveEnabled && (
                <div className="space-y-4">
                  {selectedCategory === 'bracelet' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name for Engraving *
                      </label>
                      <input
                        type="text"
                        value={engraveName}
                        onChange={(e) => setEngraveName(e.target.value)}
                        placeholder="Enter name to engrave"
                        maxLength={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum 20 characters</p>
                    </div>
                  )}

                  {selectedCategory !== 'bracelet' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Text
                      </label>
                      <input
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Enter custom text"
                        maxLength={30}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum 30 characters</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-600"
                >
                  -
                </button>
                <span className="text-xl font-medium w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-600"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Base Price ({categoryInfo[selectedCategory].title})</span>
                  <span>${categoryInfo[selectedCategory].basePrice.toFixed(2)}</span>
                </div>
                {selectedSizes.length > 1 && (
                  <div className="flex justify-between">
                    <span>Additional Sizes ({selectedSizes.length - 1})</span>
                    <span>+${((selectedSizes.length - 1) * 10).toFixed(2)}</span>
                  </div>
                )}
                {engraveEnabled && (engraveName || customText) && (
                  <div className="flex justify-between">
                    <span>Engraving</span>
                    <span>+$15.00</span>
                  </div>
                )}
                {quantity > 1 && (
                  <div className="flex justify-between">
                    <span>Quantity ({quantity})</span>
                    <span>×{quantity}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${calculatePrice().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="text-center">
              <button
                onClick={handleAddToCart}
                disabled={selectedSizes.length === 0}
                className="btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Custom {categoryInfo[selectedCategory].title} to Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
