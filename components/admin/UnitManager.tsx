'use client'

import { useState } from 'react'
import ImageUpload from './ImageUpload'

export interface ProductUnit {
  _id?: string
  unitId?: string
  size?: string
  color?: string
  price: number
  stock: number
  images: string[] // Unit-specific images
  saleConfig: {
    isOnSale: boolean
    saleType: 'percentage' | 'amount'
    saleValue: number
  }
  sku?: string
}

interface UnitManagerProps {
  units: ProductUnit[]
  onUnitsChange: (units: ProductUnit[]) => void
  productImages: string[]
  errors: Record<string, string>
}

export default function UnitManager({ units, onUnitsChange, productImages, errors }: UnitManagerProps) {
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null)

  const addUnit = () => {
    const newUnit: ProductUnit = {
      name: '',
      price: 0,
      stock: 0,
      images: [],
      saleConfig: {
        isOnSale: false,
        saleType: 'percentage',
        saleValue: 0
      }
    }
    onUnitsChange([...units, newUnit])
    setExpandedUnit(units.length)
  }

  const removeUnit = (index: number) => {
    const newUnits = units.filter((_, i) => i !== index)
    onUnitsChange(newUnits)
    if (expandedUnit === index) {
      setExpandedUnit(null)
    }
  }

  const updateUnit = (index: number, field: keyof ProductUnit, value: any) => {
    const newUnits = [...units]
    if (field === 'saleConfig') {
      newUnits[index] = { ...newUnits[index], saleConfig: { ...newUnits[index].saleConfig, ...value } }
    } else {
      newUnits[index] = { ...newUnits[index], [field]: value }
    }
    onUnitsChange(newUnits)
  }

  const toggleExpand = (index: number) => {
    setExpandedUnit(expandedUnit === index ? null : index)
  }

  return (
    <div className="space-y-4">
      {units.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <p className="mb-4">No units/variants added yet.</p>
          <button
            type="button"
            onClick={addUnit}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Add First Unit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${expandedUnit === index ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {unit.name || `Unit ${index + 1}`}
                      </h4>
                      <p className="text-sm text-gray-500">
                        ${unit.price.toFixed(2)} • Stock: {unit.stock}
                        {unit.saleConfig.isOnSale && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            On Sale
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeUnit(index)
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {expandedUnit === index && (
                <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit Name *
                      </label>
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) => updateUnit(index, 'name', e.target.value)}
                        placeholder="e.g., Size M, Red Variant"
                        className={`mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors[`unit_${index}_name`] ? 'border-red-300' : 'focus:border-purple-500 focus:ring-purple-500'
                          }`}
                      />
                      {errors[`unit_${index}_name`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`unit_${index}_name`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Price * ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={unit.price}
                        onChange={(e) => updateUnit(index, 'price', parseFloat(e.target.value) || 0)}
                        className={`mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors[`unit_${index}_price`] ? 'border-red-300' : 'focus:border-purple-500 focus:ring-purple-500'
                          }`}
                      />
                      {errors[`unit_${index}_price`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`unit_${index}_price`]}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Stock *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={unit.stock}
                        onChange={(e) => updateUnit(index, 'stock', parseInt(e.target.value) || 0)}
                        className={`mt-1 block w-full sm:w-32 shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 ${errors[`unit_${index}_stock`] ? 'border-red-300' : 'focus:border-purple-500 focus:ring-purple-500'
                          }`}
                      />
                      {errors[`unit_${index}_stock`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`unit_${index}_stock`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Unit Sale Configuration */}
                  <div className="border border-gray-200 rounded p-3">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id={`unit-sale-${index}`}
                        checked={unit.saleConfig.isOnSale}
                        onChange={(e) => updateUnit(index, 'saleConfig', { isOnSale: e.target.checked })}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`unit-sale-${index}`} className="ml-2 block text-sm text-gray-900">
                        Enable sale for this unit
                      </label>
                    </div>

                    {unit.saleConfig.isOnSale && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Sale Type</label>
                          <select
                            value={unit.saleConfig.saleType}
                            onChange={(e) => updateUnit(index, 'saleConfig', { saleType: e.target.value as 'percentage' | 'amount' })}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-gray-900"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="amount">Fixed Amount ($)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Sale Value</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={unit.saleConfig.saleValue}
                            onChange={(e) => updateUnit(index, 'saleConfig', { saleValue: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                            placeholder={unit.saleConfig.saleType === 'percentage' ? '20' : '10.00'}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unit Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Images
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      {productImages.length > 0
                        ? "These images will override the product's main images for this unit. Leave empty to use product images."
                        : "Add images specific to this unit variant."
                      }
                    </p>
                    <ImageUpload
                      images={unit.images}
                      onImagesChange={(images) => updateUnit(index, 'images', images)}
                      maxImages={5}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addUnit}
            className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            + Add Another Unit/Variant
          </button>
        </div>
      )}
    </div>
  )
}
