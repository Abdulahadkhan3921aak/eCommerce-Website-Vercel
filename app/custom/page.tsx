'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Header from '@/components/Header'
import { showNotification } from '@/lib/notifications'
import { showAlert } from '@/components/AlertProvider'

// Update to match the Product model enum - only singular forms
type JewelryCategory = 'ring' | 'necklace' | 'earring' | 'bracelet'

interface SizeOption {
  id: string
  name: string
  displayName: string
  inches: string
  centimeters: string
  description?: string
}

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
    image: '/images/custom-ring.jpg'
  },
  necklace: {
    title: 'Custom Necklace',
    description: 'Design a beautiful necklace with your choice of length and personalization',
    image: '/images/custom-necklace.jpg'
  },
  earring: {
    title: 'Custom Earrings',
    description: 'Handcrafted earrings tailored to your style and preferences',
    image: '/images/custom-earrings.jpg'
  },
  bracelet: {
    title: 'Custom Bracelet',
    description: 'Personalized bracelet with optional name engraving',
    image: '/images/custom-bracelet.jpg'
  }
}

export default function CustomProductPage() {
  const { user } = useUser()
  const [selectedCategory, setSelectedCategory] = useState<JewelryCategory | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [allowMultipleSizes, setAllowMultipleSizes] = useState(false)
  const [engraveName, setEngraveName] = useState('')
  const [engraveEnabled, setEngraveEnabled] = useState(false)
  const [customText, setCustomText] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
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
  const [addressError, setAddressError] = useState('')

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

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setAddressForm(prev => ({ ...prev, [name]: name === 'state' ? value.toUpperCase() : value }))
  }

  // US state name to abbreviation map (moved outside for global access)
  const stateNameMap: { [key: string]: string } = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC'
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddressError('')

    // Basic client-side validation for required fields
    if (!addressForm.name?.trim() || !addressForm.line1?.trim() || !addressForm.city?.trim() ||
      !addressForm.state?.trim() || !addressForm.postalCode?.trim() || !addressForm.country?.trim()) {

      const missingFields = []
      if (!addressForm.name?.trim()) missingFields.push('name')
      if (!addressForm.line1?.trim()) missingFields.push('street address')
      if (!addressForm.city?.trim()) missingFields.push('city')
      if (!addressForm.state?.trim()) missingFields.push('state')
      if (!addressForm.postalCode?.trim()) missingFields.push('ZIP code')
      if (!addressForm.country?.trim()) missingFields.push('country')

      setAddressError(`Please fill in all required fields: ${missingFields.join(', ')}.`)
      return
    }

    // US-specific validation
    if (addressForm.country === 'US') {
      // Check for PO Box
      if (/\bP\.?O\.?\s*BOX\b/i.test(addressForm.line1)) {
        setAddressError('PO Boxes are not supported for US shipping. Please provide a street address.')
        return
      }

      // Validate ZIP code format
      if (!/^\d{5}(-\d{4})?$/.test(addressForm.postalCode)) {
        setAddressError('Please enter a valid US ZIP code (e.g., 12345 or 12345-6789).')
        return
      }

      // Enhanced state validation
      const validStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
      ]

      const stateUpper = addressForm.state.toUpperCase().trim()
      const isValidStateCode = validStates.includes(stateUpper)
      const isValidStateName = stateNameMap[stateUpper]

      if (!isValidStateCode && !isValidStateName) {
        setAddressError('Please enter a valid US state (e.g., FL or Florida).')
        return
      }

      // Convert full state name to abbreviation for consistency
      if (isValidStateName && !isValidStateCode) {
        setAddressForm(prev => ({
          ...prev,
          state: stateNameMap[stateUpper]
        }))
      }
    }

    try {
      // Use the current form state (which might have been updated above)
      const addressToValidate = {
        ...addressForm,
        state: addressForm.country === 'US' && stateNameMap[addressForm.state.toUpperCase().trim()]
          ? stateNameMap[addressForm.state.toUpperCase().trim()]
          : addressForm.state
      }

      const response = await fetch('/api/shipping/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressToValidate })
      })

      const data = await response.json()

      if (!response.ok || !data.isValid) {
        setAddressError(data.messages?.join('. ') || data.error || 'Invalid address. Please check and try again.')
        return
      }

      const validatedAddress: ShippingAddress = {
        name: data.correctedAddress?.name || addressToValidate.name,
        line1: data.correctedAddress?.line1 || addressToValidate.line1,
        line2: data.correctedAddress?.line2 || addressToValidate.line2,
        city: data.correctedAddress?.city || addressToValidate.city,
        state: data.correctedAddress?.state || addressToValidate.state,
        postalCode: data.correctedAddress?.postalCode || addressToValidate.postalCode,
        country: data.correctedAddress?.country || addressToValidate.country,
        phone: data.correctedAddress?.phone || addressToValidate.phone,
        email: data.correctedAddress?.email || addressToValidate.email,
      }

      setShippingAddress(validatedAddress)
      setAddressForm(validatedAddress)
      setShowAddressForm(false)
    } catch (error) {
      console.error('Address validation error:', error)
      setAddressError('Address validation failed. Please try again.')
    }
  }

  const handleSubmitOrder = async () => {
    if (!selectedCategory || selectedSizes.length === 0) {
      showAlert('Please select a category and size', 'warning')
      return
    }

    if (!shippingAddress) {
      showAlert('Please add a valid shipping address', 'warning')
      return
    }

    if (selectedCategory === 'bracelet' && engraveEnabled && !engraveName) {
      showAlert('Please enter a name for engraving', 'warning')
      return
    }

    setIsSubmitting(true)

    try {
      const selectedSizeNames = selectedSizes.map(sizeId => {
        const size = categorySizes[selectedCategory].find(s => s.id === sizeId)
        return size?.displayName || sizeId
      }).join(', ')

      const customOrderData = {
        category: selectedCategory, // This will now match the enum values
        title: categoryInfo[selectedCategory].title,
        description: categoryInfo[selectedCategory].description,
        sizes: selectedSizeNames,
        engraving: engraveEnabled ? (engraveName || customText) : null,
        quantity,
        notes,
        shippingAddress,
        customerEmail: user?.emailAddresses?.[0]?.emailAddress,
        customerId: user?.id
      }

      const response = await fetch('/api/orders/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customOrderData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit custom order')
      }

      // Show success message with order number
      showAlert(`Custom order submitted successfully! Order Number: ${data.orderNumber}\n\nWe will contact you with pricing and details.`, 'success')

      // Reset form
      setSelectedCategory(null)
      setSelectedSizes([])
      setEngraveName('')
      setEngraveEnabled(false)
      setCustomText('')
      setQuantity(1)
      setNotes('')

    } catch (error) {
      console.error('Error submitting custom order:', error)
      showAlert(`Failed to submit order: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRingSizeSVG = (size: SizeOption, isSelected: boolean) => {
    const sizeNum = parseInt(size.name)
    const radius = 20 + (sizeNum - 4) * 3 // Scale ring size visually

    return (
      <div
        key={size.id}
        className={`cursor-pointer transition-all duration-200 ${isSelected ? 'transform scale-110' : 'hover:scale-105'}`}
        onClick={() => handleSizeSelect(size.id)}
      >
        <div className="flex flex-col items-center">
          <svg width="80" height="80" viewBox="0 0 80 80" className="mb-2">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={isSelected ? '#7C3AED' : '#6B7280'}
              strokeWidth={isSelected ? '3' : '2'}
              className="transition-colors"
            />
            <text
              x="40"
              y="45"
              textAnchor="middle"
              className={`text-sm font-bold ${isSelected ? 'fill-purple-600' : 'fill-gray-600'}`}
            >
              {size.name}
            </text>
          </svg>
          <div className="text-center">
            <div className="text-xs text-gray-600">{size.inches}</div>
            <div className="text-xs text-gray-500">{size.centimeters}</div>
          </div>
        </div>
      </div>
    )
  }

  const getNecklaceSizeSVG = (size: SizeOption, isSelected: boolean) => {
    const length = parseInt(size.name)
    const pathLength = 50 + (length - 14) * 5 // Scale necklace length

    return (
      <div
        key={size.id}
        className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
        onClick={() => handleSizeSelect(size.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`font-medium ${isSelected ? 'text-purple-600' : 'text-gray-900'}`}>
            {size.displayName}
          </span>
          <span className="text-sm text-gray-500">{size.description}</span>
        </div>

        <div className="flex items-center mb-2">
          <svg width="60" height="40" viewBox="0 0 60 40" className="mr-4">
            <path
              d={`M 5 20 Q 30 ${20 - pathLength / 10} 55 20`}
              fill="none"
              stroke={isSelected ? '#7C3AED' : '#6B7280'}
              strokeWidth="2"
              className="transition-colors"
            />
            <circle cx="5" cy="20" r="2" fill={isSelected ? '#7C3AED' : '#6B7280'} />
            <circle cx="55" cy="20" r="2" fill={isSelected ? '#7C3AED' : '#6B7280'} />
          </svg>

          <div className="text-sm text-gray-600">
            <div>{size.inches} / {size.centimeters}</div>
          </div>
        </div>
      </div>
    )
  }

  const getEarringSizeSVG = (size: SizeOption, isSelected: boolean) => {
    const sizeMultiplier = size.name === 'small' ? 0.7 : size.name === 'large' ? 1.3 : 1

    return (
      <div
        key={size.id}
        className={`cursor-pointer p-6 border-2 rounded-lg transition-all text-center ${isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
        onClick={() => handleSizeSelect(size.id)}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" className="mx-auto mb-3">
          <g transform={`scale(${sizeMultiplier}) translate(${30 * (1 - sizeMultiplier)}, ${30 * (1 - sizeMultiplier)})`}>
            <circle
              cx="30"
              cy="30"
              r="15"
              fill={isSelected ? '#7C3AED' : '#6B7280'}
              className="transition-colors"
            />
            <circle cx="30" cy="15" r="3" fill="white" />
          </g>
        </svg>

        <div className={`font-medium mb-1 ${isSelected ? 'text-purple-600' : 'text-gray-900'}`}>
          {size.displayName}
        </div>
        <div className="text-sm text-gray-600">{size.inches} / {size.centimeters}</div>
        <div className="text-xs text-gray-500 mt-1">{size.description}</div>
      </div>
    )
  }

  const getBraceletSizeSVG = (size: SizeOption, isSelected: boolean) => {
    const sizeMap = { xs: 0.6, s: 0.7, m: 0.8, l: 0.9, xl: 1.0 }
    const scale = sizeMap[size.name as keyof typeof sizeMap] || 0.8

    return (
      <div
        key={size.id}
        className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${isSelected ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}
        onClick={() => handleSizeSelect(size.id)}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`font-bold text-lg ${isSelected ? 'text-purple-600' : 'text-gray-900'}`}>
            {size.displayName}
          </span>
          <span className="text-sm text-gray-500">{size.description}</span>
        </div>

        <div className="flex items-center mb-2">
          <svg width="80" height="40" viewBox="0 0 80 40" className="mr-4">
            <ellipse
              cx="40"
              cy="20"
              rx={30 * scale}
              ry="15"
              fill="none"
              stroke={isSelected ? '#7C3AED' : '#6B7280'}
              strokeWidth="3"
              className="transition-colors"
            />
          </svg>

          <div className="text-sm text-gray-600">
            <div>{size.inches} / {size.centimeters}</div>
          </div>
        </div>
      </div>
    )
  }

  // Load saved address from user metadata
  useEffect(() => {
    const loadSavedAddress = async () => {
      if (!user) {
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
  }, [user])

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create Custom Jewelry</h1>
          <p className="text-xl text-gray-600">Design your perfect piece - We'll provide pricing after review</p>
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
                  <div className="text-lg font-bold text-purple-600">Custom Quote</div>
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
                  Order multiple sizes (pricing will be adjusted accordingly)
                </span>
              </label>
            </div>

            {/* Size Selection with SVGs */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Select Size{allowMultipleSizes ? 's' : ''}
              </h3>

              {selectedCategory === 'ring' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap justify-center gap-8 py-8">
                    {categorySizes.ring.map(size => getRingSizeSVG(size, selectedSizes.includes(size.id)))}
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
                    {categorySizes.necklace.map(size => getNecklaceSizeSVG(size, selectedSizes.includes(size.id)))}
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
                    {categorySizes.earring.map(size => getEarringSizeSVG(size, selectedSizes.includes(size.id)))}
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
                    {categorySizes.bracelet.map(size => getBraceletSizeSVG(size, selectedSizes.includes(size.id)))}
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

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes or Specifications
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests, material preferences, or additional details..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{notes.length}/500 characters</p>
            </div>

            {/* Shipping Address Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>

              {shippingAddress && !showAddressForm ? (
                <div className="bg-white border border-gray-200 rounded-md p-4">
                  <p className="font-medium text-gray-900">{shippingAddress.name}</p>
                  <p className="text-sm text-gray-600">{shippingAddress.line1}</p>
                  {shippingAddress.line2 && <p className="text-sm text-gray-600">{shippingAddress.line2}</p>}
                  <p className="text-sm text-gray-600">
                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                  </p>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Change Address
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                >
                  + Add Shipping Address
                </button>
              )}

              {/* Address Form Modal */}
              {showAddressForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Shipping Address
                    </h3>

                    <form onSubmit={handleAddressSubmit} className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={addressForm.name}
                          onChange={handleAddressChange}
                          placeholder="Full name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Line 1 *
                        </label>
                        <input
                          type="text"
                          name="line1"
                          value={addressForm.line1}
                          onChange={handleAddressChange}
                          placeholder="Street address, P.O. box, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          name="line2"
                          value={addressForm.line2}
                          onChange={handleAddressChange}
                          placeholder="Apartment, suite, unit, building, floor, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={addressForm.city}
                            onChange={handleAddressChange}
                            placeholder="City"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            State *
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={addressForm.state}
                            onChange={handleAddressChange}
                            placeholder="State"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ZIP / Postal Code *
                          </label>
                          <input
                            type="text"
                            name="postalCode"
                            value={addressForm.postalCode}
                            onChange={handleAddressChange}
                            placeholder="ZIP or Postal Code"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Country
                          </label>
                          <select
                            name="country"
                            value={addressForm.country}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="US">United States</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={addressForm.phone}
                          onChange={handleAddressChange}
                          placeholder="(555) 123-4567"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={addressForm.email}
                          onChange={handleAddressChange}
                          placeholder="your.email@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {addressError && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-red-800 text-sm">{addressError}</p>
                        </div>
                      )}

                      <div className="flex space-x-3 pt-4">
                        <button
                          type="submit"
                          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
                        >
                          Validate Address
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddressForm(false)
                            setAddressError('')
                          }}
                          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="font-medium">{categoryInfo[selectedCategory].title}</span>
                </div>

                {selectedSizes.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size{selectedSizes.length > 1 ? 's' : ''}:</span>
                    <span className="font-medium">
                      {selectedSizes.map(sizeId => {
                        const size = categorySizes[selectedCategory].find(s => s.id === sizeId)
                        return size?.displayName
                      }).join(', ')}
                    </span>
                  </div>
                )}

                {engraveEnabled && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Engraving:</span>
                    <span className="font-medium">
                      {selectedCategory === 'bracelet' ? engraveName : customText} (+$15)
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{quantity}</span>
                </div>

                {notes && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-600 block mb-1">Notes:</span>
                    <span className="text-sm text-gray-800">{notes}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-purple-200">
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">Custom Quote Required</p>
                  <p className="text-sm text-gray-600 mt-1">
                    We'll provide detailed pricing after reviewing your specifications
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || selectedSizes.length === 0 || !shippingAddress}
                className={`w-full max-w-md py-4 px-8 rounded-lg text-white font-semibold text-lg transition-all ${isSubmitting || selectedSizes.length === 0 || !shippingAddress
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                  }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Order...</span>
                  </div>
                ) : (
                  'Submit Custom Order Request'
                )}
              </button>

              {(!shippingAddress || selectedSizes.length === 0) && (
                <p className="text-sm text-red-600 mt-2">
                  {!shippingAddress && 'Please add a shipping address. '}
                  {selectedSizes.length === 0 && 'Please select at least one size.'}
                </p>
              )}
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">⏱️</div>
                <h4 className="font-semibold text-gray-900 mb-2">Processing Time</h4>
                <p className="text-sm text-gray-600">
                  Custom orders typically take 2-4 weeks to complete after approval
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">📞</div>
                <h4 className="font-semibold text-gray-900 mb-2">Personal Consultation</h4>
                <p className="text-sm text-gray-600">
                  Our team will contact you within 24 hours to discuss your order
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl mb-3">🚚</div>
                <h4 className="font-semibold text-gray-900 mb-2">US Shipping Only</h4>
                <p className="text-sm text-gray-600">
                  We currently ship custom jewelry within the United States only
                </p>
              </div>
            </div>

            {/* Materials & Process Information */}
            <div className="bg-gray-50 rounded-lg p-8 mt-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Our Custom Process
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">1</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Submit Request</h4>
                  <p className="text-sm text-gray-600">
                    Share your vision with detailed specifications
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Design Review</h4>
                  <p className="text-sm text-gray-600">
                    Our artisans review and provide quote
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Approval</h4>
                  <p className="text-sm text-gray-600">
                    Approve design and make payment
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">4</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Handcraft</h4>
                  <p className="text-sm text-gray-600">
                    Expert crafting and quality assurance
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <h4 className="font-semibold text-gray-900 mb-3">Premium Materials Available</h4>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                  <span className="bg-white px-3 py-1 rounded-full">14K Gold</span>
                  <span className="bg-white px-3 py-1 rounded-full">18K Gold</span>
                  <span className="bg-white px-3 py-1 rounded-full">Sterling Silver</span>
                  <span className="bg-white px-3 py-1 rounded-full">Platinum</span>
                  <span className="bg-white px-3 py-1 rounded-full">Natural Diamonds</span>
                  <span className="bg-white px-3 py-1 rounded-full">Precious Gemstones</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

