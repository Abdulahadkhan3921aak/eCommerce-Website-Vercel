'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/contexts/CartContext'
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import Header from "@/components/Header"
import { useRouter } from 'next/navigation'

interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  residential?: boolean;
  phone?: string;
  email?: string;
}

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getTotalPrice, getTotalItems, isLoading, clearCart } = useCart()
  const { user, isLoaded: isUserLoaded } = useUser()
  const router = useRouter()
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [addressValidationLoading, setAddressValidationLoading] = useState(false)
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
  const [isClientLoaded, setIsClientLoaded] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  // Handle client-side hydration
  useEffect(() => {
    setIsClientLoaded(true)
  }, [])

  // Filter out custom items from regular cart
  const regularItems = items.filter(item => item.category !== 'custom')
  const customItems = items.filter(item => item.category === 'custom')

  // Load saved address from user metadata or prefill from user profile
  useEffect(() => {
    const loadSavedAddress = async () => {
      if (!isUserLoaded || !user) {
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
  }, [user, isUserLoaded]) // Remove items.length and regularItems.length from dependencies

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
      } else {
        const responseData = await response.json()
      }
    } catch (error) {
      // Don't throw the error - we don't want to block the form submission if saving fails
    }
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddressValidationLoading(true)
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
      setAddressValidationLoading(false)
      return
    }

    // US-specific validation
    if (addressForm.country === 'US') {
      // Check for PO Box
      if (/\bP\.?O\.?\s*BOX\b/i.test(addressForm.line1)) {
        setAddressError('PO Boxes are not supported for US shipping. Please provide a street address.')
        setAddressValidationLoading(false)
        return
      }

      // Validate ZIP code format
      if (!/^\d{5}(-\d{4})?$/.test(addressForm.postalCode)) {
        setAddressError('Please enter a valid US ZIP code (e.g., 12345 or 12345-6789).')
        setAddressValidationLoading(false)
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
      }

      const stateUpper = addressForm.state.toUpperCase().trim()
      const isValidStateCode = validStates.includes(stateUpper)
      const isValidStateName = stateNameMap[stateUpper]

      if (!isValidStateCode && !isValidStateName) {
        setAddressError('Please enter a valid US state (e.g., FL or Florida).')
        setAddressValidationLoading(false)
        return
      }

      // Convert full state name to abbreviation for consistency
      if (isValidStateName && !isValidStateCode) {
        setAddressForm(prev => ({
          ...prev,
          state: stateNameMap[stateUpper]
        }))
      }

      try {
        // Use the current form state (which might have been updated above)
        const addressToValidate = {
          ...addressForm,
          state: isValidStateName && !isValidStateCode ? stateNameMap[stateUpper] : addressForm.state
        }


        // Validate address with shipping service
        const response = await fetch('/api/shipping/validate-address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: addressToValidate }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Address validation failed')
        }

        if (!data.isValid) {
          setAddressError(data.messages?.join('. ') || 'Invalid address. Please check and try again.')
          setAddressValidationLoading(false)
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
          residential: data.isResidential,
          phone: data.correctedAddress?.phone || addressToValidate.phone,
          email: data.correctedAddress?.email || addressToValidate.email,
        }

        setShippingAddress(validatedAddress)
        setAddressForm(validatedAddress)
        setShowAddressForm(false)

        // Save the validated address to Clerk private metadata
        await saveAddressToClerk(validatedAddress)

      } catch (error) {
        console.error('Address validation error:', error)
        setAddressError(error instanceof Error ? error.message : 'Address validation failed')
      } finally {
        setAddressValidationLoading(false)
      }
    } else {
      // For non-US countries, just validate required fields and proceed
      try {
        const addressToValidate = { ...addressForm }

        const validatedAddress: ShippingAddress = {
          name: addressToValidate.name,
          line1: addressToValidate.line1,
          line2: addressToValidate.line2,
          city: addressToValidate.city,
          state: addressToValidate.state,
          postalCode: addressToValidate.postalCode,
          country: addressToValidate.country,
          residential: true, // Default for non-US
          phone: addressToValidate.phone,
          email: addressToValidate.email,
        }

        setShippingAddress(validatedAddress)
        setAddressForm(validatedAddress)
        setShowAddressForm(false)

        // Save the address to Clerk private metadata
        await saveAddressToClerk(validatedAddress)

      } catch (error) {
        console.error('Address save error:', error)
        setAddressError('Failed to save address. Please try again.')
      } finally {
        setAddressValidationLoading(false)
      }
    }
  }

  const handlePlaceOrder = async () => {
    if (regularItems.length === 0) {
      showAlert('Your cart is empty!', 'warning')
      return
    }

    if (!shippingAddress) {
      showAlert('Please add a shipping address', 'warning')
      return
    }

    setIsSubmittingOrder(true)
    try {
      // Create order without shipping rate calculations
      const response = await fetch('/api/orders/create-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItemIds: regularItems.map(item => ({
            productId: item.productId || item._id?.split('_')[0] || item._id,
            unitId: item.unitId,
            quantity: item.quantity,
            size: item.size,
            color: item.color
          })),
          shippingAddress,
          customerInfo: {
            name: user?.fullName || shippingAddress.name,
            email: user?.emailAddresses?.[0]?.emailAddress || shippingAddress.email,
            phone: user?.phoneNumbers?.[0]?.phoneNumber || shippingAddress.phone,
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order')
      }

      // Clear cart after successful order creation
      console.log('Order created successfully, clearing cart...')
      await clearCart()

      // Set order number and show success popup
      setOrderNumber(data.orderNumber)
      setShowSuccessPopup(true)

      console.log('Cart cleared successfully after order placement')

    } catch (error) {
      console.error('Order creation error:', error)
      showAlert(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setOrderNumber('')
    router.push('/products')
  }

  // Update calculations to use regular items only
  const subtotal = regularItems.reduce((total, item) => total + item.effectivePrice * item.quantity, 0)
  const regularItemsCount = regularItems.reduce((total, item) => total + item.quantity, 0)

  // Show loading state until both client and cart are loaded
  if (!isClientLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading your cart...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Shopping Cart</h1>

        {/* Custom Items Notice */}
        {customItems.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Custom Orders Detected</h3>
            <p className="text-yellow-700 text-sm mb-3">
              You have {customItems.length} custom order(s) that require separate processing.
              These items will be handled through our custom order system.
            </p>
            <div className="space-y-2">
              {customItems.map((item, index) => (
                <div key={`custom-${item._id}-${index}`} className="bg-white rounded p-3 border border-yellow-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.name}</span>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  {item.size && <p className="text-sm text-gray-600">Size: {item.size}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {regularItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h8a2 2 0 002-2v-6M7 13H5a2 2 0 00-2 2v4a2 2 0 002 2h2" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Your cart is empty</h3>
            <p className="mt-1 text-gray-600">Start adding some items to your cart!</p>
            <div className="mt-4 sm:mt-6 space-x-4">
              <Link href="/products" className="btn-primary inline-block">
                Continue Shopping
              </Link>
              <Link href="/custom" className="btn-secondary inline-block">
                Create Custom Order
              </Link>
            </div>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
            {/* Cart Items - Only Regular Items */}
            <div className="lg:col-span-8">
              <div className="space-y-4 sm:space-y-6">
                {regularItems.map((item, index) => (
                  <div key={`${item._id}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="w-full sm:w-24 h-48 sm:h-24 flex-shrink-0">
                      <Image
                        src={(item.unitImages && item.unitImages.length > 0 ? item.unitImages[0] : item.images[0])}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover rounded-md"
                        unoptimized={false}
                      />
                    </div>

                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900">{item.name}</h3>
                      <div className="mt-1 flex flex-wrap text-sm text-gray-600 gap-x-4">
                        <span className="font-medium">Category: {item.category}</span>
                        {item.size && <span>Size: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {item.salePrice && item.salePrice < item.price ? (
                          <>
                            <span className="text-sm text-gray-500 line-through">${item.price.toFixed(2)}</span>
                            <span className="text-base sm:text-lg font-bold text-red-600">${item.salePrice.toFixed(2)}</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Sale
                            </span>
                          </>
                        ) : (
                          <span className="text-base sm:text-lg font-bold text-gray-900">${item.effectivePrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end space-y-2 sm:space-y-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-700 font-medium"
                          disabled={item.quantity <= 1 || isLoading}
                        >
                          -
                        </button>
                        <span className="text-base sm:text-lg font-bold text-gray-900 w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-purple-600 text-gray-700 font-medium"
                          disabled={isLoading}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                          ${(item.effectivePrice * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="mt-1 sm:mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary - Only for Regular Items */}
            <div className="lg:col-span-4 mt-6 lg:mt-0">
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 space-y-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Order Summary</h2>

                {/* US Shipping Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    🇺🇸 US Shipping Only - No PO Boxes
                  </p>
                  <p className="text-xs text-blue-700">
                    Shipping costs and payment details will be provided after order review.
                  </p>
                </div>

                {/* Shipping Address Section */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Shipping Address</h3>

                  {shippingAddress && !showAddressForm ? (
                    <div className="bg-white border border-gray-200 rounded-md p-3">
                      <p className="font-medium text-gray-900">{shippingAddress.name}</p>
                      <p className="text-sm text-gray-600">{shippingAddress.line1}</p>
                      {shippingAddress.line2 && <p className="text-sm text-gray-600">{shippingAddress.line2}</p>}
                      <p className="text-sm text-gray-600">
                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                      </p>
                      {shippingAddress.phone && <p className="text-sm text-gray-600">Phone: {shippingAddress.phone}</p>}
                      {shippingAddress.email && <p className="text-sm text-gray-600">Email: {shippingAddress.email}</p>}
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
                      className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {shippingAddress ? 'Edit Shipping Address' : 'Add Shipping Address'}
                    </button>
                  )}

                  {/* Address Form Modal */}
                  {showAddressForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {shippingAddress ? 'Edit Shipping Address' : 'Enter Shipping Address'}
                        </h3>

                        <form onSubmit={handleAddressSubmit} className="space-y-3">
                          <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text" id="name" name="name" required
                              value={addressForm.name} onChange={handleAddressChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                              Phone (for shipping updates)
                            </label>
                            <input
                              type="tel" id="phone" name="phone"
                              value={addressForm.phone} onChange={handleAddressChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Optional but recommended"
                            />
                          </div>

                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                              Email (for order updates) *
                            </label>
                            <input
                              type="email" id="email" name="email" required
                              value={addressForm.email} onChange={handleAddressChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label htmlFor="line1" className="block text-sm font-medium text-gray-700 mb-1">
                              Street Address *
                            </label>
                            <input
                              type="text" id="line1" name="line1" required
                              value={addressForm.line1} onChange={handleAddressChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="No PO Boxes for US addresses"
                            />
                          </div>

                          <div>
                            <label htmlFor="line2" className="block text-sm font-medium text-gray-700 mb-1">
                              Apartment, suite, etc.
                            </label>
                            <input
                              type="text" id="line2" name="line2"
                              value={addressForm.line2} onChange={handleAddressChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                City *
                              </label>
                              <input
                                type="text" id="city" name="city" required
                                value={addressForm.city} onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div>
                              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                                State *
                              </label>
                              <input
                                type="text" id="state" name="state" required
                                value={addressForm.state} onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                maxLength={20}
                                placeholder="e.g., CA or California"
                              />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                              ZIP / Postal Code *
                            </label>
                            <input
                              type="text" id="postalCode" name="postalCode" required
                              value={addressForm.postalCode} onChange={handleAddressChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="e.g., 90210"
                            />
                          </div>

                          <div>
                            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                            <select
                              id="country" name="country" required
                              value={addressForm.country}
                              onChange={(e) => setAddressForm(prev => ({ ...prev, country: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="US">United States</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                              📏 Shipping calculations use US Imperial units (inches, pounds)
                            </p>
                          </div>

                          {addressError && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-3">
                              <p className="text-sm text-red-800">{addressError}</p>
                            </div>
                          )}

                          <div className="flex space-x-3 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddressForm(false)
                                setAddressError('')
                                if (shippingAddress) setAddressForm(shippingAddress);
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={addressValidationLoading}
                              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                            >
                              {addressValidationLoading ? 'Validating...' : (shippingAddress ? 'Save Address' : 'Validate & Save')}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Total Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({regularItemsCount} items)</span>
                      <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium text-gray-900">TBD</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium text-gray-900">TBD</span>
                    </div>

                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <span className="text-base font-semibold text-gray-900">Items Total</span>
                        <span className="text-lg font-bold text-gray-900">${subtotal.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">*Final total will include shipping and tax</p>
                    </div>
                  </div>
                </div>

                {/* Place Order Button */}
                <div className="pt-4">
                  <button
                    onClick={handlePlaceOrder}
                    className="w-full py-3 px-4 bg-purple-600 text-white rounded-md text-base font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={isSubmittingOrder || regularItems.length === 0 || !shippingAddress}
                  >
                    {isSubmittingOrder ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Placing Order...
                      </span>
                    ) : (
                      `Place Order`
                    )}
                  </button>

                  {!shippingAddress && (
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Please add a shipping address to continue
                    </p>
                  )}

                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-800 font-medium">📋 Order Process</p>
                    <p className="text-xs text-blue-700">
                      After placing your order, we'll review it and contact you via email with order acceptance, payment details, and shipping information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-md text-center">
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Placed Successfully!</h3>
              <p className="text-sm text-gray-600 mb-1">Order Number: {orderNumber}</p>
              <p className="text-sm text-gray-600 mb-6">
                You will be notified on your email about order acceptance, payment and shipping details. Thank you!
              </p>

              <button
                onClick={handleCloseSuccessPopup}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}