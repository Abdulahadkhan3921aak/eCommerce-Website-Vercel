'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'

export interface CartItem {
  _id: string
  name: string
  price: number
  salePrice?: number
  effectivePrice: number
  quantity: number
  images: string[]
  category: string
}

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }

const CartContext = createContext<{
  state: CartState
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  addToCart: (product: any, quantity?: number, size?: string, color?: string) => void
  removeItem: (id: string) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
} | null>(null)

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item._id === action.payload._id)
      
      let newItems: CartItem[]
      if (existingItem) {
        newItems = state.items.map(item =>
          item._id === action.payload._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }]
      }
      
      const total = newItems.reduce((sum, item) => sum + (item.effectivePrice * item.quantity), 0)
      const itemCount = newItems.reduce((count, item) => count + item.quantity, 0)
      
      return { items: newItems, total, itemCount }
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item._id !== action.payload)
      const total = newItems.reduce((sum, item) => sum + (item.effectivePrice * item.quantity), 0)
      const itemCount = newItems.reduce((count, item) => count + item.quantity, 0)
      
      return { items: newItems, total, itemCount }
    }
    
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: action.payload.id })
      }
      
      const newItems = state.items.map(item =>
        item._id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      )
      
      const total = newItems.reduce((sum, item) => sum + (item.effectivePrice * item.quantity), 0)
      const itemCount = newItems.reduce((count, item) => count + item.quantity, 0)
      
      return { items: newItems, total, itemCount }
    }
    
    case 'CLEAR_CART':
      return { items: [], total: 0, itemCount: 0 }
    
    case 'LOAD_CART': {
      const total = action.payload.reduce((sum, item) => sum + (item.effectivePrice * item.quantity), 0)
      const itemCount = action.payload.reduce((count, item) => count + item.quantity, 0)
      return { items: action.payload, total, itemCount }
    }
    
    default:
      return state
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
  })

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        const cartItems = JSON.parse(savedCart)
        if (Array.isArray(cartItems)) {
          dispatch({ type: 'LOAD_CART', payload: cartItems })
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
      localStorage.removeItem('cart') // Clear corrupted data
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state.items))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }, [state.items])

  const addItem = (item: any) => {
    try {
      // Validate required fields
      if (!item._id || !item.name || typeof item.price !== 'number') {
        console.error('Invalid item data:', item)
        return
      }

      // Transform and validate the item data
      const cartItem: Omit<CartItem, 'quantity'> = {
        _id: item._id,
        name: item.name,
        price: item.price,
        salePrice: item.salePrice,
        effectivePrice: item.salePrice || item.price,
        images: Array.isArray(item.images) ? item.images : 
                item.imageUrl ? [item.imageUrl] :
                item.image ? [item.image] : [],
        category: item.category || item.categoryName || 'Uncategorized'
      }

      dispatch({ type: 'ADD_ITEM', payload: cartItem })
    } catch (error) {
      console.error('Error adding item to cart:', error)
    }
  }

  const addToCart = (product: any, quantity: number = 1, size?: string, color?: string) => {
    try {
      // Validate required fields
      if (!product._id || !product.name || typeof product.price !== 'number') {
        console.error('Invalid product data:', product)
        return
      }

      // Transform and validate the product data
      const cartItem: Omit<CartItem, 'quantity'> = {
        _id: product._id,
        name: product.name,
        price: product.price,
        salePrice: product.salePrice,
        effectivePrice: product.salePrice || product.price,
        images: Array.isArray(product.images) ? product.images : 
                product.imageUrl ? [product.imageUrl] :
                product.image ? [product.image] : [],
        category: product.category || product.categoryName || 'Uncategorized'
      }

      // Add the item multiple times based on quantity
      for (let i = 0; i < quantity; i++) {
        dispatch({ type: 'ADD_ITEM', payload: cartItem })
      }
    } catch (error) {
      console.error('Error adding product to cart:', error)
    }
  }

  const removeItem = (id: string) => {
    try {
      dispatch({ type: 'REMOVE_ITEM', payload: id })
    } catch (error) {
      console.error('Error removing item from cart:', error)
    }
  }

  const removeFromCart = (id: string) => {
    try {
      dispatch({ type: 'REMOVE_ITEM', payload: id })
    } catch (error) {
      console.error('Error removing item from cart:', error)
    }
  }

  const updateQuantity = (id: string, quantity: number) => {
    try {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }

  const clearCart = () => {
    try {
      dispatch({ type: 'CLEAR_CART' })
    } catch (error) {
      console.error('Error clearing cart:', error)
    }
  }

  const getTotalPrice = () => {
    return state.total
  }

  const getTotalItems = () => {
    return state.itemCount
  }

  return (
    <CartContext.Provider value={{
      state,
      items: state.items,
      addItem,
      addToCart,
      removeItem,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
