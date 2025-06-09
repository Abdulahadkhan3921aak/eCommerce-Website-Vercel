'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/contexts/CartContext'
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs"
import Header from "@/components/Header"

interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string; // Keep as postalCode for form, map to 'zip' for Shippo
  country: string;
  residential?: boolean;
  phone?: string;
  email?: string;
}

interface ShippingRate {
  rateId: string; // Shippo's rate object_id
  serviceType: string; // Shippo's servicelevel.token (e.g., "usps_priority")
  serviceName: string; // Descriptive name (e.g., "USPS Priority Mail")
  cost: number;
  originalCost: number; // Cost before free shipping adjustment
  estimatedDelivery: string; // User-friendly string (e.g., "Approx. 3 days")
  deliveryDays?: number; // Actual number of days if available
  isFreeShipping?: boolean;
  provider?: string; // e.g., "USPS", "FedEx"
  providerLogo?: string; // URL for provider logo
}

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getTotalPrice, getTotalItems, isLoading } = useCart()
  const { user, isLoaded: isUserLoaded } = useUser() // Added isUserLoaded
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null)
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null)
  const [addressValidationLoading, setAddressValidationLoading] = useState(false)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [addressForm, setAddressForm] = useState<ShippingAddress>({ // Initialize with ShippingAddress type
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US', // Default to US
    phone: '',
    email: ''
  })
  const [addressError, setAddressError] = useState('')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(100) // Default, will be updated from API
  const [qualifiesForFreeShipping, setQualifiesForFreeShipping] = useState(false)


  // Load saved address from user metadata or prefill from user profile
  useEffect(() => {
    if (isUserLoaded && user) { // Ensure user data is loaded
      const savedAddress = user.privateMetadata?.shippingAddress as ShippingAddress | undefined;
      if (savedAddress) {
        setShippingAddress(savedAddress);
        setAddressForm({ // Ensure all fields are populated, including new ones
          name: savedAddress.name || user.fullName || '',
          line1: savedAddress.line1 || '',
          line2: savedAddress.line2 || '',
          city: savedAddress.city || '',
          state: savedAddress.state || '',
          postalCode: savedAddress.postalCode || '',
          country: savedAddress.country || 'US',
          phone: savedAddress.phone || user.phoneNumbers?.[0]?.phoneNumber || '',
          email: savedAddress.email || user.emailAddresses?.[0]?.emailAddress || ''
        });
        // Automatically fetch rates if address is already set
        if (items.length > 0) {
          getShippingRates(savedAddress);
        }
      } else {
        // Pre-fill from Clerk user data if no saved address
        setAddressForm(prev => ({
          ...prev,
          name: user.fullName || '',
          phone: user.phoneNumbers?.[0]?.phoneNumber || '',
          email: user.emailAddresses?.[0]?.emailAddress || ''
        }));
      }
    }
  }, [user, isUserLoaded, items.length]) // Add items.length to re-fetch rates if cart changes and address exists

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: name === 'state' ? value.toUpperCase() : value }));
  };


  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddressValidationLoading(true)
    setAddressError('')
    setShippingRates([]) // Clear old rates
    setSelectedShippingRate(null)

    // Basic client-side validation for required fields
    if (!addressForm.name || !addressForm.line1 || !addressForm.city || !addressForm.state || !addressForm.postalCode || !addressForm.country) {
      setAddressError('Please fill in all required address fields (*).');
      setAddressValidationLoading(false);
      return;
    }
    if (addressForm.country === 'US' && (addressForm.line1.toLowerCase().includes('po box') || addressForm.line1.toLowerCase().includes('p.o. box'))) {
      setAddressError('PO Box addresses are not accepted for US shipments. Please provide a street address.');
      setAddressValidationLoading(false);
      return;
    }


    try {
      const response = await fetch('/api/shipping/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressForm), // Send current form state
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Address validation failed')
      }

      if (!data.isValid) {
        setAddressError(data.messages?.join('. ') || 'Invalid address. Please check and try again.')
        // Optionally update form with corrected suggestions if available and desired
        if (data.correctedAddress) {
          // Example: setAddressForm(data.correctedAddress) // if you want to auto-fill corrections
        }
        return
      }

      const validatedAddress: ShippingAddress = {
        name: data.correctedAddress?.name || addressForm.name,
        line1: data.correctedAddress?.line1 || addressForm.line1,
        line2: data.correctedAddress?.line2 || addressForm.line2,
        city: data.correctedAddress?.city || addressForm.city,
        state: data.correctedAddress?.state || addressForm.state,
        postalCode: data.correctedAddress?.postalCode || addressForm.postalCode,
        country: data.correctedAddress?.country || addressForm.country,
        residential: data.isResidential, // This comes from our API response
        phone: data.correctedAddress?.phone || addressForm.phone,
        email: data.correctedAddress?.email || addressForm.email,
      };

      setShippingAddress(validatedAddress)
      setAddressForm(validatedAddress) // Update form with validated/corrected address
      setShowAddressForm(false)

      // Get shipping rates if cart is not empty
      if (items.length > 0) {
        await getShippingRates(validatedAddress)
      } else {
        setRatesLoading(false) // Ensure ratesLoading is false if cart is empty
      }

    } catch (error) {
      setAddressError(error instanceof Error ? error.message : 'Address validation failed')
    } finally {
      setAddressValidationLoading(false)
    }
  }

  const getShippingRates = async (addressToUse: ShippingAddress) => {
    if (!addressToUse || items.length === 0) {
      setShippingRates([])
      setSelectedShippingRate(null)
      setRatesLoading(false)
      return
    }
    setRatesLoading(true)
    setAddressError('') // Clear previous address errors when fetching rates
    try {
      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: addressToUse, // Use the provided address
          cartItems: items.map(item => ({ // Send necessary item details for parcel calculation
            _id: item._id,
            name: item.name,
            quantity: item.quantity,
            effectivePrice: item.effectivePrice,
            weight: item.weight || 0.5, // Default weight in lbs if not specified
            length: item.dimensions?.length || 6, // Default dimensions in inches
            width: item.dimensions?.width || 6,
            height: item.dimensions?.height || 6,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get shipping rates')
      }

      setFreeShippingThreshold(data.freeShippingThreshold || 100)
      setQualifiesForFreeShipping(data.qualifiesForFreeShipping || false)

      const fetchedRates: ShippingRate[] = data.rates || []
      setShippingRates(fetchedRates)


      if (fetchedRates.length > 0) {
        // Auto-select the cheapest rate, or the first free one if available
        const freeRate = fetchedRates.find(rate => rate.isFreeShipping);
        if (freeRate) {
          setSelectedShippingRate(freeRate);
        } else {
          setSelectedShippingRate(fetchedRates.sort((a, b) => a.cost - b.cost)[0]);
        }
      } else {
        setSelectedShippingRate(null)
        setAddressError('No shipping options available for this address. Please check the address or contact support.')
      }

    } catch (error) {
      console.error('Error getting shipping rates:', error)
      setAddressError(error instanceof Error ? error.message : 'Failed to calculate shipping rates. Please try again.')
      setShippingRates([])
      setSelectedShippingRate(null)
    } finally {
      setRatesLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Your cart is empty!')
      return
    }

    setIsCheckoutLoading(true)
    try {
      // Calculate final shipping cost
      const shippingCost = selectedShippingRate ? selectedShippingRate.cost : 0

      // Format items for Stripe
      const stripeItems = items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.images.length > 0 ? [item.images[0]] : [],
            description: `Quantity: ${item.quantity}`,
          },
          unit_amount: Math.round(item.effectivePrice * 100),
        },
        quantity: item.quantity,
      }))

      // Add shipping as a line item if there's a cost
      if (shippingCost > 0 && selectedShippingRate) {
        stripeItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedShippingRate.serviceName || 'Shipping',
              description: `Estimated delivery: ${selectedShippingRate.estimatedDelivery}`,
            },
            unit_amount: Math.round(shippingCost * 100),
          },
          quantity: 1,
        })
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: stripeItems, // These are for Stripe's line_items
          cartItems: items.map(item => ({ // These are for creating the Order document
            _id: item._id,
            productId: item.productId, // Ensure productId is passed if different from _id
            name: item.name,
            price: item.price, // Original price
            salePrice: item.salePrice,
            effectivePrice: item.effectivePrice, // Price used for subtotal
            quantity: item.quantity,
            images: item.images,
            size: item.size,
            color: item.color,
            unitId: item.unitId,
            category: item.category,
            // Pass weight and dimensions if needed for order record, though primarily used for rate calc
            weight: item.weight,
            dimensions: item.dimensions,
          })),
          shippingAddress, // The validated and selected shipping address
          selectedShippingRate, // The full selected shipping rate object
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed')
      }

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(`Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  const subtotal = getTotalPrice()
  // Shipping cost is now directly from selectedShippingRate.cost, which already considers free shipping
  const shipping = selectedShippingRate ? selectedShippingRate.cost : 0;
  const taxRate = 0.08; // Example: 8% tax. Consider making this configurable.
  const tax = (subtotal + (selectedShippingRate && !selectedShippingRate.isFreeShipping ? selectedShippingRate.originalCost : 0)) * taxRate; // Tax on subtotal + original shipping cost if not free
  const total = subtotal + shipping + tax


  // Calculate how much more needed for free shipping
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal)

  if (isLoading) {
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

        {items.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h8a2 2 0 002-2v-6M7 13H5a2 2 0 00-2 2v4a2 2 0 002 2h2" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Your cart is empty</h3>
            <p className="mt-1 text-gray-600">Start adding some items to your cart!</p>
            <Link href="/products" className="mt-4 sm:mt-6 btn-primary inline-block">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
            {/* Cart Items */}
            <div className="lg:col-span-8">
              <div className="space-y-4 sm:space-y-6">
                {items.map((item, index) => (
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
                        {item.unitId && <span>Unit: {item.unitId}</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {item.salePrice ? (
                          <>
                            <span className="text-sm text-gray-500 line-through">${item.price.toFixed(2)}</span>
                            <span className="text-base sm:text-lg font-bold text-red-600">${item.salePrice.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-base sm:text-lg font-bold text-gray-900">${item.price.toFixed(2)}</span>
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

            {/* Order Summary */}
            <div className="lg:col-span-4 mt-6 lg:mt-0">
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 space-y-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Order Summary</h2>

                {/* US Shipping Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 font-medium">
                    🇺🇸 US Shipping Only - No PO Boxes
                  </p>
                  <p className="text-xs text-blue-700">
                    Ensure your address is correct. We validate addresses before showing shipping rates.
                  </p>
                </div>

                {/* Free Shipping Progress */}
                {items.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    {qualifiesForFreeShipping ? (
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-800 font-medium">🎉 You qualify for FREE shipping!</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-blue-800 font-medium">Free shipping on orders ${freeShippingThreshold.toFixed(2)}+</span>
                          <span className="text-blue-600 text-sm">
                            ${amountNeededForFreeShipping.toFixed(2)} away
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}


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
                        onClick={() => {
                          setShowAddressForm(true);
                          // setAddressForm(shippingAddress); // Ensure form is populated with current address for editing
                        }}
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

                  {/* Address Form Modal or Inline */}
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
                                maxLength={20} // Allow longer for non-US, or adjust based on country
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
                              {/* Add other countries if you ship internationally */}
                              {/* <option value="CA">Canada</option> */}
                            </select>
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
                                // Optionally reset addressForm to shippingAddress if editing was cancelled
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
                              {addressValidationLoading ? 'Validating...' : (shippingAddress ? 'Save & Get Rates' : 'Validate & Get Rates')}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shipping Options */}
                {shippingAddress && items.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Shipping Options</h3>
                    {ratesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Calculating shipping...</p>
                      </div>
                    ) : shippingRates.length > 0 ? (
                      <div className="space-y-2">
                        {shippingRates.map((rate) => (
                          <label key={rate.rateId} className={`flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${selectedShippingRate?.rateId === rate.rateId ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300' : 'border-gray-200'}`}>
                            <input
                              type="radio"
                              name="shippingOption" // Changed name to avoid conflict if any other radio group exists
                              checked={selectedShippingRate?.rateId === rate.rateId}
                              onChange={() => setSelectedShippingRate(rate)}
                              className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                            />
                            {rate.providerLogo && (
                              <Image src={rate.providerLogo} alt={rate.provider || ''} width={24} height={24} className="mr-2 h-6 w-auto object-contain" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">
                                {rate.serviceName}
                                {rate.isFreeShipping && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    FREE
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">{rate.estimatedDelivery}</p>
                            </div>
                            <p className="font-semibold text-sm text-gray-900">
                              ${rate.cost.toFixed(2)}
                            </p>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600">No shipping options available for the selected address.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Checkout Button */}
                <div className="pt-4">
                  <button
                    onClick={handleCheckout}
                    className="w-full py-2 px-4 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                    disabled={isCheckoutLoading || items.length === 0 || !shippingAddress || ratesLoading}
                  >
                    {isCheckoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}