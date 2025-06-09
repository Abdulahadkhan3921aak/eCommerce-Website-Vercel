'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/lib/contexts/CartContext'
import Header from "@/components/Header"
import { Product, ProductUnit, getUnitEffectivePrice, isUnitOnSale, getProductPriceRange, getProductDisplayPrice, hasAnySale, getSaleInfo } from '@/lib/types/product'


interface Props {
  product: Product | null
}

export default function ProductClient({ product }: Props) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [availableStock, setAvailableStock] = useState(0)
  const [displayImages, setDisplayImages] = useState<string[]>([])

  const { addToCart } = useCart()

  // Helper function to get display images
  const getDisplayImages = (product: Product, selectedUnit: ProductUnit | null): string[] => {
    // If a unit is selected and has images, use unit images
    if (selectedUnit && selectedUnit.images && selectedUnit.images.length > 0) {
      const validImages = selectedUnit.images.filter(img => img && typeof img === 'string' && img.trim().length > 0);
      if (validImages.length > 0) return validImages;
    }

    // Fallback to product images
    const validProductImages = product.images?.filter(img => img && typeof img === 'string' && img.trim().length > 0) || [];
    return validProductImages.length > 0 ? validProductImages : ['/placeholder-image.png'];
  };

  // Calculate price and stock based on selected unit or product
  const getCurrentPriceInfo = () => {
    if (selectedUnit) {
      const effectivePrice = getUnitEffectivePrice(product, selectedUnit);
      const saleInfo = getSaleInfo(product, selectedUnit);

      return {
        originalPrice: selectedUnit.price,
        effectivePrice,
        isOnSale: saleInfo?.isOnSale || false,
        saleInfo
      };
    } else if (product.units && product.units.length > 0) {
      // Show price range when no unit is selected
      const priceRange = getProductPriceRange(product);
      return {
        originalPrice: null,
        effectivePrice: priceRange.min,
        priceRange,
        isOnSale: hasAnySale(product),
        saleInfo: null
      };
    } else {
      // Legacy product without units
      const effectivePrice = getProductDisplayPrice(product);
      const saleInfo = getSaleInfo(product);

      return {
        originalPrice: product.price,
        effectivePrice,
        isOnSale: saleInfo?.isOnSale || false,
        saleInfo
      };
    }
  };

  const priceInfo = getCurrentPriceInfo();

  // Update display images when product or selected unit changes
  useEffect(() => {
    if (product) {
      const images = getDisplayImages(product, selectedUnit);
      setDisplayImages(images);
      setSelectedImageIndex(0); // Reset to first image when display images change
    }
  }, [product, selectedUnit]);

  // Update selected unit when size/color changes
  useEffect(() => {
    if (product?.units && product.units.length > 0) {
      const matchingUnit = product.units.find(unit =>
        (!selectedSize || unit.size === selectedSize) &&
        (!selectedColor || unit.color === selectedColor)
      );

      if (matchingUnit) {
        setSelectedUnit(matchingUnit);
        setAvailableStock(matchingUnit.stock);
      } else {
        // Find any available unit with stock
        const availableUnit = product.units.find(unit => unit.stock > 0);
        setSelectedUnit(availableUnit || null);
        setAvailableStock(availableUnit?.stock || 0);
      }
    }
  }, [selectedSize, selectedColor, product]);

  // Set default selections when product loads
  useEffect(() => {
    if (product?.sizes?.length) setSelectedSize(product.sizes[0])
    if (product?.colors?.length) setSelectedColor(product.colors[0])
  }, [product])

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    // For products with units, require unit selection
    if (product.units && product.units.length > 0) {
      if (!selectedUnit) {
        // The CartContext will show an error notification
        addToCart(product, quantity, selectedSize, selectedColor, undefined);
        return;
      }

      // Check stock before adding
      if (quantity > availableStock) {
        return; // CartContext will handle the error notification
      }

      // Create a product object with the correct price from the selected unit
      const productWithUnitPrice: Product = {
        ...product,
        price: selectedUnit.price,
        salePrice: isUnitOnSale(product, selectedUnit) ? getUnitEffectivePrice(product, selectedUnit) : undefined
      };
      console.log('Adding to cart:', productWithUnitPrice, quantity, selectedSize, selectedColor, selectedUnit.unitId);
      addToCart(productWithUnitPrice, quantity, selectedSize, selectedColor, selectedUnit.unitId);
    } else {
      // For products without units, use the product directly
      addToCart(product, quantity, selectedSize, selectedColor, undefined);
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= availableStock && newQuantity > 0) {
      setQuantity(newQuantity);
    } else if (newQuantity > availableStock) {
      setQuantity(availableStock);
      // Let CartContext handle the notification when adding to cart
    } else {
      setQuantity(1); // Minimum quantity is 1
    }
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
            <Link href="/products" className="btn-primary">
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isOutOfStock = availableStock === 0;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* Image Gallery */}
          <div className="flex flex-col-reverse">
            {/* Image Thumbnails */}
            <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
              <div className="grid grid-cols-4 gap-6">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-offset-4 focus:ring-opacity-25 ${selectedImageIndex === index ? 'ring-2 ring-purple-500' : ''
                      }`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <span className="sr-only">Image {index + 1}</span>
                    <span className="absolute inset-0 rounded-md overflow-hidden">
                      <Image
                        src={image}
                        alt={`Product image ${index + 1}`}
                        width={96}
                        height={96}
                        className="w-full h-full object-center object-cover"
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Image */}
            <div className="w-full aspect-square">
              <Image
                src={displayImages[selectedImageIndex]}
                alt={product.name}
                width={600}
                height={600}
                className="w-full h-full object-center object-cover sm:rounded-lg"
                priority
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.name}</h1>

            {/* Price */}
            <div className="mt-3">
              {priceInfo.priceRange ? (
                <div>
                  <p className="text-3xl text-gray-900">
                    ${priceInfo.priceRange.min.toFixed(2)} - ${priceInfo.priceRange.max.toFixed(2)}
                  </p>
                  {priceInfo.isOnSale && (
                    <p className="text-sm text-red-600 font-medium mt-1">Sale prices included</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {priceInfo.isOnSale && priceInfo.originalPrice ? (
                    <>
                      <p className="text-2xl text-gray-500 line-through">
                        ${priceInfo.originalPrice.toFixed(2)}
                      </p>
                      <p className="text-3xl text-red-600 font-bold">
                        ${priceInfo.effectivePrice.toFixed(2)}
                      </p>
                      {priceInfo.saleInfo && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {priceInfo.saleInfo.saleType === 'percentage'
                            ? `${priceInfo.saleInfo.saleValue}% OFF`
                            : `$${priceInfo.saleInfo.saleValue} OFF`}
                          {priceInfo.saleInfo.source === 'unit' && ' (Unit Sale)'}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-3xl text-gray-900">${priceInfo.effectivePrice.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="mt-3">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-200'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="ml-2 text-sm text-gray-500">({product.reviews} reviews)</p>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mt-6">
              <h3 className="sr-only">Description</h3>
              <div className="text-base text-gray-900 space-y-6">
                <p>{product.description}</p>
              </div>
            </div>

            {/* Product Options */}
            {product.units && product.units.length > 0 && (
              <div className="mt-8 space-y-6">
                {/* Size Selection */}
                {product.units.some(unit => unit.size) && (
                  <div>
                    <h3 className="text-sm text-gray-900 font-medium">Size</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.from(new Set(product.units.filter(unit => unit.size).map(unit => unit.size))).map((size) => {
                        const unitsForSize = product.units.filter(unit => unit.size === size);
                        const hasStock = unitsForSize.some(unit => unit.stock > 0);
                        const isSelected = selectedSize === size;

                        return (
                          <button
                            key={size}
                            className={`px-4 py-2 text-sm font-medium rounded-md border ${isSelected
                              ? 'border-purple-600 bg-purple-50 text-purple-600'
                              : hasStock
                                ? 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                            onClick={() => hasStock && setSelectedSize(size)}
                            disabled={!hasStock}
                          >
                            {size}
                            {!hasStock && ' (Out of Stock)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Color Selection */}
                {product.units.some(unit => unit.color) && (
                  <div>
                    <h3 className="text-sm text-gray-900 font-medium">Color</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.from(new Set(product.units.filter(unit => unit.color).map(unit => unit.color))).map((color) => {
                        const unitsForColor = product.units.filter(unit =>
                          unit.color === color && (!selectedSize || unit.size === selectedSize)
                        );
                        const hasStock = unitsForColor.some(unit => unit.stock > 0);
                        const isSelected = selectedColor === color;

                        return (
                          <button
                            key={color}
                            className={`px-4 py-2 text-sm font-medium rounded-md border ${isSelected
                              ? 'border-purple-600 bg-purple-50 text-purple-600'
                              : hasStock
                                ? 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              }`}
                            onClick={() => hasStock && setSelectedColor(color)}
                            disabled={!hasStock}
                          >
                            {color}
                            {!hasStock && ' (Out of Stock)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Unit Info */}
                {selectedUnit && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900">Selected Option</h4>
                    <div className="mt-2 space-y-1">
                      {selectedUnit.size && (
                        <p className="text-sm text-gray-600">Size: {selectedUnit.size}</p>
                      )}
                      {selectedUnit.color && (
                        <p className="text-sm text-gray-600">Color: {selectedUnit.color}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {isUnitOnSale(product, selectedUnit) ? (
                          <>
                            <span className="text-sm text-gray-500 line-through">
                              ${selectedUnit.price.toFixed(2)}
                            </span>
                            <span className="text-lg font-bold text-red-600">
                              ${getUnitEffectivePrice(product, selectedUnit).toFixed(2)}
                            </span>
                            {priceInfo.saleInfo && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {priceInfo.saleInfo.source === 'unit' ? 'Unit Sale' : 'Product Sale'}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            ${selectedUnit.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Stock: {selectedUnit.stock} available</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stock Status */}
            <div className="mt-6">
              {availableStock > 0 ? (
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-green-600 font-medium">
                    {availableStock <= 5 ? `Only ${availableStock} left!` : 'In Stock'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-red-600 font-medium">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Quantity and Add to Cart */}
            <div className="mt-8">
              <div className="flex items-center space-x-4 mb-4">
                <label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                  Quantity:
                </label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={availableStock === 0}
                >
                  {[...Array(Math.min(10, availableStock))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white ${isOutOfStock
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                  }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13v6a2 2 0 002 2h8a2 2 0 002-2v-6M7 13H5a2 2 0 00-2 2v4a2 2 0 002 2h2" />
                </svg>
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
