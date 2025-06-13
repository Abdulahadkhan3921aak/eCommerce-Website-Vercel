'use client'

import { useState, useEffect } from 'react'
import { usePopup } from '@/lib/contexts/PopupContext'

interface Order {
    _id: string
    orderNumber: string
    total: number
    status: string
    shippingWeight?: number
    shippingDimensions?: {
        length: number
        width: number
        height: number
        unit?: 'in' | 'cm'
    }
    shippingWeightUnit?: 'lb' | 'kg'
    shippoShipment?: {
        rateId?: string
        carrier?: string
        serviceLevelName?: string
        cost?: number
        trackingNumber?: string
        labelUrl?: string
    }
}

interface ShippingRate {
    rateId: string
    carrier: string
    serviceName: string
    serviceLevelToken: string
    serviceLevelName: string
    cost: number
    currency: string
    estimatedDays?: number
    deliveryEstimate: string
    attributes: string[]
    providerImage?: string
    arrivesBy?: string
    durationTerms?: string
    messages: any[]
}

interface ShippingModalProps {
    isOpen: boolean
    onClose: () => void
    order: Order
    onOrderUpdate?: () => Promise<void> | void
}

export default function ShippingModal({
    isOpen,
    onClose,
    order,
    onOrderUpdate
}: ShippingModalProps) {
    const [shippingWeightInput, setShippingWeightInput] = useState('')
    const [shippingLengthInput, setShippingLengthInput] = useState('')
    const [shippingWidthInput, setShippingWidthInput] = useState('')
    const [shippingHeightInput, setShippingHeightInput] = useState('')
    const [selectedWeightUnit, setSelectedWeightUnit] = useState<'lb' | 'kg'>('lb')
    const [selectedDimensionUnit, setSelectedDimensionUnit] = useState<'in' | 'cm'>('in')
    const [availableRates, setAvailableRates] = useState<ShippingRate[]>([])
    const [selectedRateId, setSelectedRateId] = useState<string>('')
    const [loadingRates, setLoadingRates] = useState(false)
    const [applyingRate, setApplyingRate] = useState(false)

    const { showAlert } = usePopup()

    // Initialize form with order data
    useEffect(() => {
        if (order) {
            setShippingWeightInput(order.shippingWeight?.toString() || '')
            if (order.shippingDimensions &&
                typeof order.shippingDimensions.length === 'number' &&
                typeof order.shippingDimensions.width === 'number' &&
                typeof order.shippingDimensions.height === 'number') {
                setShippingLengthInput(order.shippingDimensions.length.toString())
                setShippingWidthInput(order.shippingDimensions.width.toString())
                setShippingHeightInput(order.shippingDimensions.height.toString())
                setSelectedDimensionUnit(order.shippingDimensions.unit || 'in')
            } else {
                // Reset dimension inputs if shippingDimensions is invalid
                setShippingLengthInput('')
                setShippingWidthInput('')
                setShippingHeightInput('')
                setSelectedDimensionUnit('in')
            }
            setSelectedWeightUnit(order.shippingWeightUnit || 'lb')
        }
    }, [order])

    // Clear rates when opening modal for new order
    useEffect(() => {
        if (isOpen) {
            setAvailableRates([])
            setSelectedRateId('')
        }
    }, [isOpen, order._id])

    const handleUpdateShippingDetails = async () => {
        const weight = parseFloat(shippingWeightInput)
        const length = parseFloat(shippingLengthInput)
        const width = parseFloat(shippingWidthInput)
        const height = parseFloat(shippingHeightInput)

        if (isNaN(weight) || isNaN(length) || isNaN(width) || isNaN(height) ||
            weight <= 0 || length <= 0 || width <= 0 || height <= 0) {
            showAlert('Please enter valid positive numbers for all shipping details.', 'warning')
            return
        }

        setLoadingRates(true)
        try {
            const response = await fetch(`/api/admin/orders/${order._id}/shipping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shippingWeight: weight,
                    shippingWeightUnit: selectedWeightUnit,
                    shippingDimensions: {
                        length,
                        width,
                        height,
                        unit: selectedDimensionUnit
                    }
                })
            })

            const data = await response.json()

            if (response.ok) {
                showAlert(data.message || `Package details updated. Found ${data.rates?.length || 0} shipping options.`, 'success')
                setAvailableRates(data.rates || [])
                if (onOrderUpdate) {
                    await onOrderUpdate()
                }
            } else {
                showAlert(data.error || 'Failed to update shipping details', 'error')
            }
        } catch (error) {
            console.error('Error updating shipping details:', error)
            showAlert('Failed to update shipping details.', 'error')
        } finally {
            setLoadingRates(false)
        }
    }

    const handleSelectShippingRate = async () => {
        if (!selectedRateId) return

        const selectedRate = availableRates.find(rate => rate.rateId === selectedRateId)
        if (!selectedRate) return

        setApplyingRate(true)
        try {
            const response = await fetch(`/api/admin/orders/${order._id}/shipping/select-rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rateId: selectedRateId,
                    rateDetails: selectedRate
                })
            })

            const data = await response.json()

            if (response.ok) {
                showAlert(data.message || 'Shipping rate applied successfully!', 'success')
                setAvailableRates([])
                setSelectedRateId('')
                if (onOrderUpdate) {
                    await onOrderUpdate()
                }
            } else {
                showAlert(data.error || 'Failed to apply shipping rate', 'error')
            }
        } catch (error) {
            console.error('Error applying shipping rate:', error)
            showAlert('Failed to apply shipping rate.', 'error')
        } finally {
            setApplyingRate(false)
        }
    }

    const handleClose = () => {
        setAvailableRates([])
        setSelectedRateId('')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Update Shipping Details for Order {order.orderNumber}
                </h3>
                <p className="text-sm text-gray-600 mb-1">Current Total: ${order.total.toFixed(2)}</p>
                {order.shippoShipment?.cost && (
                    <p className="text-sm text-gray-600 mb-4">Current Shipping Cost: ${order.shippoShipment.cost.toFixed(2)}</p>
                )}

                {/* Unit System Selection */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">📏 Measurement System</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Weight Unit</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="weightUnit"
                                        value="lb"
                                        checked={selectedWeightUnit === 'lb'}
                                        onChange={(e) => setSelectedWeightUnit(e.target.value as 'lb')}
                                        className="mr-2 text-blue-600"
                                    />
                                    <span className="text-sm">Pounds (lb) - US Imperial</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="weightUnit"
                                        value="kg"
                                        checked={selectedWeightUnit === 'kg'}
                                        onChange={(e) => setSelectedWeightUnit(e.target.value as 'kg')}
                                        className="mr-2 text-blue-600"
                                    />
                                    <span className="text-sm">Kilograms (kg) - Metric</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Dimension Unit</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="dimensionUnit"
                                        value="in"
                                        checked={selectedDimensionUnit === 'in'}
                                        onChange={(e) => setSelectedDimensionUnit(e.target.value as 'in')}
                                        className="mr-2 text-blue-600"
                                    />
                                    <span className="text-sm">Inches (in) - US Imperial</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="dimensionUnit"
                                        value="cm"
                                        checked={selectedDimensionUnit === 'cm'}
                                        onChange={(e) => setSelectedDimensionUnit(e.target.value as 'cm')}
                                        className="mr-2 text-blue-600"
                                    />
                                    <span className="text-sm">Centimeters (cm) - Metric</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                        💡 All measurements are converted to US Imperial for shipping calculations (Shippo API requirement)
                    </p>
                </div>

                {/* Package Details Section */}
                <div className="space-y-4 mb-6">
                    <h4 className="text-md font-medium text-gray-900">Package Details</h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Shipping Weight ({selectedWeightUnit})
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                step="0.1"
                                value={shippingWeightInput}
                                onChange={(e) => setShippingWeightInput(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder={`Weight in ${selectedWeightUnit}`}
                            />
                            <span className="text-sm text-gray-500 font-medium">{selectedWeightUnit}</span>
                        </div>
                        {selectedWeightUnit === 'kg' && shippingWeightInput && (
                            <p className="text-xs text-gray-500 mt-1">
                                ≈ {(parseFloat(shippingWeightInput) * 2.20462).toFixed(2)} lb
                            </p>
                        )}
                        {selectedWeightUnit === 'lb' && shippingWeightInput && (
                            <p className="text-xs text-gray-500 mt-1">
                                ≈ {(parseFloat(shippingWeightInput) * 0.453592).toFixed(2)} kg
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Length ({selectedDimensionUnit})
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={shippingLengthInput}
                                    onChange={(e) => setShippingLengthInput(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Length"
                                />
                                <span className="text-sm text-gray-500 font-medium">{selectedDimensionUnit}</span>
                            </div>
                            {selectedDimensionUnit === 'cm' && shippingLengthInput && (
                                <p className="text-xs text-gray-500 mt-1">
                                    ≈ {(parseFloat(shippingLengthInput) * 0.393701).toFixed(1)} in
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Width ({selectedDimensionUnit})
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={shippingWidthInput}
                                    onChange={(e) => setShippingWidthInput(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Width"
                                />
                                <span className="text-sm text-gray-500 font-medium">{selectedDimensionUnit}</span>
                            </div>
                            {selectedDimensionUnit === 'cm' && shippingWidthInput && (
                                <p className="text-xs text-gray-500 mt-1">
                                    ≈ {(parseFloat(shippingWidthInput) * 0.393701).toFixed(1)} in
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Height ({selectedDimensionUnit})
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={shippingHeightInput}
                                    onChange={(e) => setShippingHeightInput(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Height"
                                />
                                <span className="text-sm text-gray-500 font-medium">{selectedDimensionUnit}</span>
                            </div>
                            {selectedDimensionUnit === 'cm' && shippingHeightInput && (
                                <p className="text-xs text-gray-500 mt-1">
                                    ≈ {(parseFloat(shippingHeightInput) * 0.393701).toFixed(1)} in
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleUpdateShippingDetails}
                        disabled={loadingRates}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loadingRates ? 'Getting Rates...' : 'Get Shipping Rates'}
                    </button>
                </div>

                {/* Shipping Rates Selection */}
                {availableRates.length > 0 && (
                    <div className="space-y-4 mb-6">
                        <h4 className="text-md font-medium text-gray-900">
                            Select Shipping Service ({availableRates.length} options available)
                        </h4>
                        <div className="max-h-64 overflow-y-auto space-y-3">
                            {availableRates.map((rate) => (
                                <div
                                    key={rate.rateId}
                                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedRateId === rate.rateId
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setSelectedRateId(rate.rateId)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="radio"
                                                checked={selectedRateId === rate.rateId}
                                                onChange={() => setSelectedRateId(rate.rateId)}
                                                className="text-purple-600"
                                            />
                                            {rate.providerImage && (
                                                <img
                                                    src={rate.providerImage}
                                                    alt={rate.carrier}
                                                    className="w-8 h-8"
                                                />
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {rate.serviceName}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {rate.deliveryEstimate}
                                                </div>
                                                {rate.attributes.length > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        {rate.attributes.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-900">
                                                ${rate.cost.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {rate.currency}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleSelectShippingRate}
                            disabled={!selectedRateId || applyingRate}
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                            {applyingRate ? 'Applying Rate...' : 'Apply Selected Rate & Generate Label'}
                        </button>
                    </div>
                )}

                {/* Modal Actions */}
                <div className="flex space-x-3 pt-4 border-t">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                    📏 Choose your preferred measurement system. All units are automatically converted to US Imperial (inches/pounds) for shipping rate calculations as required by Shippo API.
                </p>
            </div>
        </div>
    )
}
