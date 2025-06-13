'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { usePopup } from '@/lib/contexts/PopupContext'
import { useCart } from '@/lib/contexts/CartContext'
import ImageUpload from '@/components/admin/ImageUpload'

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
  email?: string
}

export default function CustomOrderPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { showAlert } = usePopup()
  const { addToCart } = useCart()

  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    sizes: [] as string[],
    engraving: '',
    quantity: 1,
    notes: '',
    images: [] as string[]
  })

  const [orderType, setOrderType] = useState<'cart' | 'custom'>('cart')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])

  // Add shipping address state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    email: ''
  })

  // Add addressForm state for form handling
  const [addressForm, setAddressForm] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    email: ''
  })

  // Load user data and address from API
  useEffect(() => {
    const loadSavedAddress = async () => {
      if (!isLoaded || !user) {
        return
      }

      try {
        const response = await fetch('/api/user/get-shipping-address')

        if (!response.ok) {
          throw new Error('Failed to fetch shipping address')
        }

        const data = await response.json()

        if (data.success && data.address) {
          if (data.hasAddress) {
            setShippingAddress(data.address)
            setAddressForm(data.address)
          } else {
            setAddressForm(prev => ({
              ...prev,
              ...data.address
            }))
          }
        }
      } catch (error) {
        // Fallback to basic user data
        setAddressForm(prev => ({
          ...prev,
          name: user.fullName || '',
          phone: user.phoneNumbers?.[0]?.phoneNumber || '',
          email: user.emailAddresses?.[0]?.emailAddress || ''
        }))
      }
    }

    loadSavedAddress()
  }, [user, isLoaded])

  const categories = [
    { id: 'ring', name: 'Ring', icon: '💍' },
    { id: 'necklace', name: 'Necklace', icon: '📿' },
    { id: 'bracelet', name: 'Bracelet', icon: '💫' },
    { id: 'earring', name: 'Earrings', icon: '👂' }
  ]

  const getSizeOptions = (category: string) => {
    switch (category) {
      case 'ring':
        return ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']
      case 'bracelet':
        return ['XS (6")', 'S (6.5")', 'M (7")', 'L (7.5")', 'XL (8")', 'XXL (8.5")']
      case 'necklace':
        return ['14"', '16"', '18"', '20"', '22"', '24"', '26"', '28"', '30"']
      case 'earring':
        return ['Stud', 'Small (1")', 'Medium (1.5")', 'Large (2")', 'XL (2.5")', 'Statement (3"+)']
      default:
        return []
    }
  }

  const renderSizeSelector = (category: string) => {
    const sizes = getSizeOptions(category)

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sizes.map((size) => {
            const isSelected = selectedSizes.includes(size)
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`relative p-4 border-2 rounded-lg transition-all duration-200 ${isSelected
                  ? 'border-purple-600 bg-purple-50 text-purple-800'
                  : 'border-gray-300 hover:border-purple-300 text-gray-700'
                  }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  {renderSizeSVG(category, size, isSelected)}
                  <span className="text-sm font-medium">{size}</span>
                </div>
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {selectedSizes.length > 0 && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Selected Sizes:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedSizes.map((size) => (
                <span
                  key={size}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  {size}
                  <button
                    type="button"
                    onClick={() => toggleSize(size)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSizeSVG = (category: string, size: string, isSelected: boolean) => {
    const strokeColor = isSelected ? '#9333ea' : '#6b7280'
    const fillColor = isSelected ? '#f3f4f6' : 'none'

    switch (category) {
      case 'ring':
        const ringSize = parseFloat(size) || 7
        const radius = Math.max(8, Math.min(16, ringSize * 1.5))
        return (
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r={radius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
            <circle
              cx="20"
              cy="15"
              r="3"
              fill={strokeColor}
              opacity="0.7"
            />
          </svg>
        )

      case 'bracelet':
        const braceletWidths: { [key: string]: number } = {
          'XS (6")': 12, 'S (6.5")': 14, 'M (7")': 16, 'L (7.5")': 18, 'XL (8")': 20, 'XXL (8.5")': 22
        }
        const width = braceletWidths[size] || 16
        return (
          <svg width="40" height="24" viewBox="0 0 40 24">
            <ellipse
              cx="20"
              cy="12"
              rx={width}
              ry="10"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
            <circle cx="12" cy="8" r="2" fill={strokeColor} opacity="0.7" />
            <circle cx="28" cy="8" r="2" fill={strokeColor} opacity="0.7" />
          </svg>
        )

      case 'necklace':
        const necklaceLength = parseInt(size) || 18
        const curve = Math.max(10, necklaceLength / 2)
        return (
          <svg width="40" height="40" viewBox="0 0 40 40">
            <path
              d={`M 8 8 Q 20 ${curve} 32 8 Q 20 ${curve + 8} 8 8`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
            <circle cx="20" cy="8" r="3" fill={strokeColor} opacity="0.7" />
          </svg>
        )

      case 'earring':
        const earringLengths: { [key: string]: number } = {
          'Stud': 4, 'Small (1")': 8, 'Medium (1.5")': 12, 'Large (2")': 16, 'XL (2.5")': 20, 'Statement (3"+)': 24
        }
        const length = earringLengths[size] || 8
        return (
          <svg width="24" height="40" viewBox="0 0 24 40">
            <circle
              cx="12"
              cy="8"
              r="4"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
            <line
              x1="12"
              y1="12"
              x2="12"
              y2={12 + length}
              stroke={strokeColor}
              strokeWidth="2"
            />
            <circle
              cx="12"
              cy={12 + length}
              r="3"
              fill={strokeColor}
              opacity="0.7"
            />
          </svg>
        )

      default:
        return (
          <svg width="40" height="40" viewBox="0 0 40 40">
            <rect
              x="8"
              y="8"
              width="24"
              height="24"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2"
              rx="4"
            />
          </svg>
        )
    }
  }

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => {
      if (prev.includes(size)) {
        return prev.filter(s => s !== size)
      } else {
        return [...prev, size]
      }
    })
  }

  // Calculate total price including engraving surcharge (admin will set base price)
  const calculateTotalPrice = () => {
    let total = 0 // Base price will be set by admin
    if (formData.engraving.trim().length > 0) {
      total += 15 * formData.quantity // $15 surcharge per item for engraving
    }
    return total
  }

  const handleImageUpload = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }))
  }

  const handleAddToCart = () => {
    if (!user) {
      showAlert('Please sign in to add items to cart', 'warning')
      return
    }

    if (!formData.category || !formData.title || selectedSizes.length === 0) {
      showAlert('Please fill in all required fields including category, title, and sizes', 'warning')
      return
    }

    const totalPrice = calculateTotalPrice()

    // Create a custom product for the cart - using new Product interface structure
    const customProduct = {
      _id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Custom ${formData.category} - ${formData.title}`,
      category: 'custom' as ProductCategory,
      colors: ['Custom'],
      sizes: selectedSizes,
      units: [{
        unitId: `custom-${Date.now()}`,
        color: 'Custom',
        size: selectedSizes.join(', '),
        price: Math.max(totalPrice / formData.quantity, 0),
        stock: 999,
        images: formData.images.length > 0 ? formData.images : ['/images/custom-placeholder.jpg'],
        saleConfig: {
          isOnSale: false,
          saleType: 'percentage' as const,
          saleValue: 0
        }
      }],
      saleConfig: {
        isOnSale: false,
        saleType: 'percentage' as const,
        saleValue: 0
      },
      customDetails: {
        category: formData.category,
        title: formData.title,
        description: formData.description,
        sizes: selectedSizes.join(', '),
        engraving: formData.engraving,
        notes: formData.notes,
        hasEngraving: formData.engraving.trim().length > 0,
        engravingSurcharge: formData.engraving.trim().length > 0 ? 15 : 0,
        basePrice: 0,
        totalPrice: totalPrice
      }
    }

    // Use the first unit for cart addition
    addToCart(customProduct, formData.quantity, selectedSizes.join(', '), 'Custom', `custom-${Date.now()}`)

    showAlert(`Custom ${formData.category} added to cart! Admin will set pricing before processing.`, 'success')

    // Reset form
    setFormData({
      category: '',
      title: '',
      description: '',
      sizes: [],
      engraving: '',
      quantity: 1,
      notes: '',
      images: []
    })
    setSelectedSizes([])
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setAddressForm(prev => ({
      ...prev,
      [name]: name === 'state' ? value.toUpperCase() : value
    }))
  }

  const saveAddressToClerk = async (address: ShippingAddress) => {
    try {
      const response = await fetch('/api/user/save-shipping-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shippingAddress: address }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save address')
      }
    } catch (error) {
      // Don't throw the error - we don't want to block the form submission if saving fails
    }
  }

  const handleSubmitCustomOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showAlert('Please sign in to place a custom order', 'warning')
      return
    }

    if (!formData.category || !formData.title || selectedSizes.length === 0) {
      showAlert('Please fill in all required fields including at least one size', 'warning')
      return
    }

    setIsSubmitting(true)

    try {
      // Save address to Clerk before submitting order
      await saveAddressToClerk(addressForm)

      const orderData = {
        ...formData,
        sizes: selectedSizes.join(', '),
        shippingAddress: addressForm,
        userId: user.id,
        userEmail: user.emailAddresses?.[0]?.emailAddress,
        userName: user.fullName || user.firstName || 'Unknown'
      }

      const response = await fetch('/api/orders/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (response.ok) {
        showAlert('Custom order request submitted successfully! Our team will review and provide pricing within 24 hours.', 'success')
        router.push('/orders')
      } else {
        throw new Error(data.error || 'Failed to submit custom order')
      }
    } catch (error) {
      console.error('Error submitting custom order:', error)
      showAlert(`Failed to submit order: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🎨 Create Custom Jewelry</h1>
          <p className="mt-2 text-lg text-gray-600">
            Design your perfect piece with our artisan team
          </p>
        </div>

        {/* Order Type Selection */}
        <div className="bg-white rounded-lg p-6 shadow mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Type</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => setOrderType('cart')}
              className={`px-4 py-2 rounded-lg font-medium ${orderType === 'cart'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              🛒 Add to Cart (Recommended)
            </button>
            <button
              onClick={() => setOrderType('custom')}
              className={`px-4 py-2 rounded-lg font-medium ${orderType === 'custom'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              📋 Custom Order Request
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {orderType === 'cart'
              ? 'Add custom items to your cart for immediate processing with other products'
              : 'Submit as a separate custom order request for manual review'}
          </p>
        </div>

        <form onSubmit={orderType === 'cart' ? (e) => { e.preventDefault(); handleAddToCart(); } : handleSubmitCustomOrder} className="space-y-8">
          {/* Category Selection */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Select Jewelry Type</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, category: category.id }))
                    setSelectedSizes([])
                  }}
                  className={`p-4 border-2 rounded-lg transition-all duration-200 ${formData.category === category.id
                    ? 'border-purple-600 bg-purple-50 text-purple-800'
                    : 'border-gray-300 hover:border-purple-300 text-gray-700'
                    }`}
                >
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <div className="font-medium">{category.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Details */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Design Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title / Name for your design *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Vintage Rose Ring"
                />
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  max="10"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe your vision, materials, style preferences..."
                />
              </div>

              <div>
                <label htmlFor="engraving" className="block text-sm font-medium text-gray-700 mb-2">
                  Engraving / Personalization
                </label>
                <input
                  type="text"
                  id="engraving"
                  name="engraving"
                  value={formData.engraving}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Text to engrave (optional)"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Special Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Any additional requirements, deadline, budget range, etc."
                />
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Upload Reference Images</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload images to help our artisans understand your vision
            </p>
            <ImageUpload
              images={formData.images}
              onImagesChange={handleImageUpload}
              maxImages={5}
            />
          </div>

          {/* Size Selection */}
          {formData.category && (
            <div className="bg-white rounded-lg p-6 shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                3. Select Size{formData.category === 'earring' ? 's' : ''} *
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Choose one or more sizes for your {formData.category}. You can select multiple sizes if you want variations.
              </p>
              {renderSizeSelector(formData.category)}
            </div>
          )}

          {/* Pricing Summary (for cart items) - Updated to show only engraving costs */}
          {orderType === 'cart' && (
            <div className="bg-white rounded-lg p-6 shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span className="text-gray-600">To be determined by admin</span>
                </div>
                {formData.engraving.trim().length > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Engraving Surcharge ({formData.quantity}x $15.00):</span>
                    <span>+${(15 * formData.quantity).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Current Total:</span>
                  <span>
                    {calculateTotalPrice() > 0
                      ? `$${calculateTotalPrice().toFixed(2)} + base price`
                      : 'Base price to be set by admin'}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Our team will review your custom design request and set the base price.
                  You'll receive an email with the total cost before any payment is processed.
                </p>
              </div>
            </div>
          )}

          {/* Custom Order Request - Shipping Address Section */}
          {orderType === 'custom' && (
            <div className="bg-white rounded-lg p-6 shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={addressForm.name}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={addressForm.email}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="line1" className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    id="line1"
                    name="line1"
                    required
                    value={addressForm.line1}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="line2" className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    id="line2"
                    name="line2"
                    value={addressForm.line2}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    value={addressForm.city}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    required
                    value={addressForm.state}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    required
                    value={addressForm.postalCode}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    id="country"
                    name="country"
                    required
                    value={addressForm.country}
                    onChange={handleAddressChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {orderType === 'cart' ? 'Add to Cart' : 'Submit Custom Order Request'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {orderType === 'cart'
                  ? 'Add this custom item to your cart. Our team will set the pricing before processing your order.'
                  : 'Our artisan team will review your request and contact you within 24 hours with pricing and timeline'}
              </p>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.category ||
                  !formData.title ||
                  selectedSizes.length === 0 ||
                  (orderType === 'custom' && (!addressForm.name || !addressForm.line1 || !addressForm.city || !addressForm.state || !addressForm.postalCode))
                }
                className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {orderType === 'cart' ? 'Adding to Cart...' : 'Submitting...'}
                  </span>
                ) : (
                  orderType === 'cart' ? '🛒 Add to Cart' : 'Submit Custom Order Request'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

