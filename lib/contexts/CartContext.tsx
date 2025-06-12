'use client'

import React, { createContext, useReducer, useContext, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Product, ProductUnit, getUnitEffectivePrice, getProductDisplayPrice } from '@/lib/types/product'

// // Minimal Product and ProductUnit interfaces based on usage elsewhere
// // Replace with actual imports if a central type definition exists
// interface Product {
//   _id: string;
//   name: string;
//   price: number;
//   salePrice?: number;
//   images: string[];
//   category: string;
//   units?: ProductUnit[];
//   stock?: number; // For products without units
//   totalStock?: number; // For products with units (sum of unit stocks)
//   weight?: number;
//   dimensions?: { length: number; width: number; height: number; };
//   // other fields like description, etc.
// }

// interface ProductUnit {
//   unitId: string;
//   size?: string;
//   color?: string;
//   stock: number;
//   price: number;
//   salePrice?: number;
//   images?: string[];
// }

interface CartItem {
  _id: string // Unique identifier for this cart item instance (e.g., product._id + (unitId ? '_' + unitId : '_default'))
  productId: string // The actual product's ID
  name: string
  price: number // Original price of the product/unit
  salePrice?: number // Sale price of the product/unit
  effectivePrice: number // The price used for calculation (salePrice or price)
  images: string[] // Main product images
  unitImages?: string[] // Images specific to the selected unit
  category: string
  quantity: number
  size?: string
  color?: string
  unitId?: string
  stock?: number // Available stock for this specific unit/product at the time of adding
  weight?: number;
  dimensions?: { length: number; width: number; height: number; };
}

interface CartNotification {
  show: boolean
  message: string
  type: 'success' | 'error'
}

interface CartContextType {
  items: CartItem[]
  isLoading: boolean
  addToCart: (product: Product, quantity?: number, size?: string, color?: string, unitId?: string) => void
  removeFromCart: (cartItemId: string) => void // Changed productId to cartItemId
  updateQuantity: (cartItemId: string, quantity: number) => void // Changed productId to cartItemId
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
  notification: CartNotification
  clearNotification: () => void
}

interface CartState {
  items: CartItem[]
  // Removed total, as it's derived
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { item: CartItem } }
  | { type: 'REMOVE_ITEM'; payload: { cartItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { cartItemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: { items: CartItem[] } } // Payload changed to match CartState

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item => item._id === action.payload.item._id);
      if (existingItemIndex > -1) {
        // Item exists, update quantity
        const updatedItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.item.quantity }
            : item
        );
        return { ...state, items: updatedItems };
      } else {
        // Item does not exist, add new item
        return { ...state, items: [...state.items, action.payload.item] };
      }
    }
    case 'REMOVE_ITEM': {
      return {
        ...state,
        items: state.items.filter(item => item._id !== action.payload.cartItemId)
      };
    }
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        // If quantity is 0 or less, remove the item
        return {
          ...state,
          items: state.items.filter(item => item._id !== action.payload.cartItemId)
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item._id === action.payload.cartItemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    }
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'LOAD_CART':
      return { ...state, items: action.payload.items };
    default:
      return state;
  }
}

const CartContext = React.createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth()
  const [isHydrated, setIsHydrated] = React.useState(false)

  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const [isLoading, setIsLoading] = React.useState(false)
  const [notification, setNotification] = React.useState<CartNotification>({
    show: false,
    message: '',
    type: 'success'
  })

  // Handle hydration and initial cart loading
  useEffect(() => {
    setIsHydrated(true)

    // Load from localStorage only after hydration
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('butterfliesCart')
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart)
          if (parsedCart && Array.isArray(parsedCart.items)) {
            dispatch({ type: 'LOAD_CART', payload: { items: parsedCart.items } })
          }
        } catch (e) {
          console.error("Failed to parse cart from localStorage", e)
          localStorage.removeItem('butterfliesCart')
        }
      }
    }
  }, [])

  // Load cart from server when user signs in (but only after hydration)
  useEffect(() => {
    if (isHydrated && isSignedIn && userId) {
      loadCartFromServer()
    }
  }, [isSignedIn, userId, isHydrated])

  // Persist cart to localStorage only for non-signed-in users or after successful server sync
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined' && !isSignedIn) {
      localStorage.setItem('butterfliesCart', JSON.stringify(state))
    }
  }, [state.items, isSignedIn, isHydrated])

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }))
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notification.show])

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
  };

  const clearNotification = () => {
    setNotification({ show: false, message: '', type: 'success' });
  };

  const loadCartFromServer = async () => {
    if (!isSignedIn || !userId) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const serverCartData = await response.json();
        dispatch({ type: 'LOAD_CART', payload: { items: serverCartData.items || [] } });
        // Update localStorage with server data
        if (typeof window !== 'undefined') {
          localStorage.setItem('butterfliesCart', JSON.stringify({ items: serverCartData.items || [] }));
        }
      } else {
        let errorDetails = response.statusText;
        try {
          const errorData = await response.json();
          if (errorData && (errorData.error || errorData.message)) {
            errorDetails = errorData.error || errorData.message;
          }
        } catch (e) {
          console.warn('Could not parse error response as JSON:', e);
        }
        console.error(`Failed to load cart from server: Status ${response.status}`, errorDetails);
      }
    } catch (error) {
      console.error('Error loading cart from server (network or other issue):', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (product: Product, quantity: number = 1, size?: string, color?: string, unitId?: string) => {
    setIsLoading(true);
    let selectedProductUnit: ProductUnit | undefined = undefined;
    let effectivePrice = product.price;
    let itemStock = product.stock || product.totalStock || 0;
    let itemImages = product.images;
    let itemUnitImages: string[] | undefined = undefined;
    let originalPrice = product.price;
    let salePrice: number | undefined = undefined;

    // Generate consistent cart item ID
    const cartItemId = `${product._id}_${unitId || 'default'}`;

    if (unitId && product.units) {
      selectedProductUnit = product.units.find(u => u.unitId === unitId);
      if (selectedProductUnit) {
        // Use the sale calculation function for units
        effectivePrice = getUnitEffectivePrice(product, selectedProductUnit);
        originalPrice = selectedProductUnit.price;
        if (effectivePrice < originalPrice) {
          salePrice = effectivePrice;
        }
        itemStock = selectedProductUnit.stock;
        if (selectedProductUnit.images && selectedProductUnit.images.length > 0) {
          itemUnitImages = selectedProductUnit.images;
        }
      } else {
        showNotification(`Selected product variation (unit ${unitId}) not found.`, 'error');
        setIsLoading(false);
        return;
      }
    } else {
      // For products without units, use the product-level sale calculation
      effectivePrice = getProductDisplayPrice(product);
      if (effectivePrice < product.price) {
        salePrice = effectivePrice;
      }
    }

    const cartItem: CartItem = {
      _id: cartItemId,
      productId: product._id,
      name: product.name,
      price: originalPrice,
      salePrice: salePrice,
      effectivePrice,
      images: itemImages,
      unitImages: itemUnitImages,
      category: product.category,
      quantity,
      size,
      color,
      unitId,
      stock: itemStock,
      weight: product.weight,
      dimensions: product.dimensions,
    };

    // First update local state
    dispatch({ type: 'ADD_ITEM', payload: { item: cartItem } });
    showNotification(`${product.name} added to cart!`, 'success');

    if (isSignedIn) {
      try {
        await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: cartItem })
        });
        // Reload from server to ensure consistency
        await loadCartFromServer();
      } catch (error) {
        console.error('Failed to sync add to cart with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
      }
    }
    setIsLoading(false);
  };

  const removeFromCart = async (cartItemId: string) => {
    setIsLoading(true);
    const itemToRemove = state.items.find(item => item._id === cartItemId);

    // First update local state
    dispatch({ type: 'REMOVE_ITEM', payload: { cartItemId } });
    if (itemToRemove) {
      showNotification(`${itemToRemove.name} removed from cart.`, 'success');
    }

    if (isSignedIn) {
      try {
        await fetch('/api/cart/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartItemId })
        });
        // Reload from server to ensure consistency
        await loadCartFromServer();
      } catch (error) {
        console.error('Failed to sync remove from cart with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
        // Revert local state on server error
        if (itemToRemove) {
          dispatch({ type: 'ADD_ITEM', payload: { item: itemToRemove } });
        }
      }
    }
    setIsLoading(false);
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    setIsLoading(true);
    const itemToUpdate = state.items.find(item => item._id === cartItemId);
    if (itemToUpdate && quantity > (itemToUpdate.stock || Infinity)) {
      showNotification(`Cannot add more than ${itemToUpdate.stock} units of ${itemToUpdate.name}.`, 'error');
      setIsLoading(false);
      return;
    }

    const previousQuantity = itemToUpdate?.quantity || 0;

    // First update local state
    dispatch({ type: 'UPDATE_QUANTITY', payload: { cartItemId, quantity } });
    if (itemToUpdate) {
      showNotification(`${itemToUpdate.name} quantity updated.`, 'success');
    }

    if (isSignedIn) {
      try {
        await fetch('/api/cart/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartItemId, quantity })
        });
        // Reload from server to ensure consistency
        await loadCartFromServer();
      } catch (error) {
        console.error('Failed to sync update quantity with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
        // Revert local state on server error
        dispatch({ type: 'UPDATE_QUANTITY', payload: { cartItemId, quantity: previousQuantity } });
      }
    }
    setIsLoading(false);
  };

  const clearCart = async () => {
    setIsLoading(true);
    const previousItems = [...state.items];

    // First update local state
    dispatch({ type: 'CLEAR_CART' });
    showNotification('Cart cleared.', 'success');

    if (isSignedIn) {
      try {
        await fetch('/api/cart/clear', { method: 'POST' });
        // Reload from server to ensure consistency
        await loadCartFromServer();
      } catch (error) {
        console.error('Failed to sync clear cart with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
        // Revert local state on server error
        dispatch({ type: 'LOAD_CART', payload: { items: previousItems } });
      }
    }
    setIsLoading(false);
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + item.effectivePrice * item.quantity, 0);
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items: isHydrated ? state.items : [], // Return empty array until hydrated
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
        notification,
        clearNotification
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}