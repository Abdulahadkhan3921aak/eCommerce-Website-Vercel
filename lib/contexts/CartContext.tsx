'use client'

import React, { createContext, useReducer, useContext, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Product, getUnitEffectivePrice, getProductDisplayPrice } from '@/lib/types/product'

// Minimal Product and ProductUnit interfaces based on usage elsewhere
// Replace with actual imports if a central type definition exists
interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  units?: ProductUnit[];
  stock?: number; // For products without units
  totalStock?: number; // For products with units (sum of unit stocks)
  weight?: number;
  dimensions?: { length: number; width: number; height: number; };
  // other fields like description, etc.
}

interface ProductUnit {
  unitId: string;
  size?: string;
  color?: string;
  stock: number;
  price: number;
  salePrice?: number;
  images?: string[];
}

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

  const [state, dispatch] = useReducer(cartReducer, { items: [] }, (initial) => {
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('butterfliesCart');
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          // Ensure parsedCart has items array, otherwise use initial
          return parsedCart && Array.isArray(parsedCart.items) ? parsedCart : initial;
        } catch (e) {
          console.error("Failed to parse cart from localStorage", e);
          localStorage.removeItem('butterfliesCart'); // Clear corrupted cart
        }
      }
    }
    return initial; // Default initial state if nothing in localStorage or SSR
  });

  const [isLoading, setIsLoading] = React.useState(false) // Keep for API loading state
  const [notification, setNotification] = React.useState<CartNotification>({
    show: false,
    message: '',
    type: 'success'
  })

  // Load cart from server when user signs in or cart is empty and user is signed in
  useEffect(() => {
    if (isSignedIn && userId) {
      loadCartFromServer();
    }
    // If not signed in, cart is already loaded from localStorage by useReducer initializer
  }, [isSignedIn, userId]);


  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Save even if cart becomes empty to clear it from localStorage,
      // or if it was loaded and is now non-empty.
      // Avoid writing if initial load is pending and items are empty (unless explicitly cleared)
      if (state.items.length > 0 || localStorage.getItem('butterfliesCart')) {
        localStorage.setItem('butterfliesCart', JSON.stringify(state));
      }
    }
  }, [state.items]); // Depend on state.items to ensure it runs when items change


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
    if (!isSignedIn || !userId) return; // Should be redundant due to calling context
    setIsLoading(true);
    try {
      const response = await fetch('/api/cart'); // Assuming this endpoint gets the user's cart
      if (response.ok) {
        const serverCartData = await response.json();
        // serverCartData should be an object like { items: CartItem[] }
        dispatch({ type: 'LOAD_CART', payload: { items: serverCartData.items || [] } });
      } else {
        let errorDetails = response.statusText;
        try {
          // Attempt to parse a JSON error response from the server
          const errorData = await response.json();
          if (errorData && (errorData.error || errorData.message)) {
            errorDetails = errorData.error || errorData.message;
          }
        } catch (e) {
          // If parsing JSON fails, stick with the statusText
          console.warn('Could not parse error response as JSON:', e);
        }
        console.error(`Failed to load cart from server: Status ${response.status}`, errorDetails);
        // Optionally, if server fails, could decide to keep local cart or clear it
        // For now, we keep the local cart if server fetch fails after initial load.
        // You could also show a user-facing notification here:
        // showNotification(`Error loading cart: ${errorDetails}. Using local data.`, 'error');
      }
    } catch (error) {
      console.error('Error loading cart from server (network or other issue):', error);
      // showNotification('Network error while loading cart. Using local data.', 'error');
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

    const cartItemId = product._id + (unitId ? `_${unitId}` : '_default');

    if (unitId && product.units) {
      selectedProductUnit = product.units.find(u => u.unitId === unitId);
      if (selectedProductUnit) {
        effectivePrice = selectedProductUnit.salePrice ?? selectedProductUnit.price;
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
      effectivePrice = product.salePrice ?? product.price;
    }

    const cartItem: CartItem = {
      _id: cartItemId,
      productId: product._id,
      name: product.name,
      price: selectedProductUnit?.price ?? product.price,
      salePrice: selectedProductUnit?.salePrice ?? product.salePrice,
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

    dispatch({ type: 'ADD_ITEM', payload: { item: cartItem } });
    showNotification(`${product.name} added to cart!`, 'success');

    if (isSignedIn) {
      try {
        await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: cartItem }) // Send the constructed CartItem
        });
        // Optionally re-fetch cart from server to ensure sync, or trust optimistic update
        // loadCartFromServer(); 
      } catch (error) {
        console.error('Failed to sync add to cart with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
        // Potentially revert optimistic update here or handle more gracefully
      }
    }
    setIsLoading(false);
  };

  const removeFromCart = async (cartItemId: string) => {
    setIsLoading(true);
    const itemToRemove = state.items.find(item => item._id === cartItemId);
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
        // loadCartFromServer();
      } catch (error) {
        console.error('Failed to sync remove from cart with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
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
        // loadCartFromServer();
      } catch (error) {
        console.error('Failed to sync update quantity with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
      }
    }
    setIsLoading(false);
  };

  const clearCart = async () => {
    setIsLoading(true);
    dispatch({ type: 'CLEAR_CART' });
    showNotification('Cart cleared.', 'success');

    if (isSignedIn) {
      try {
        await fetch('/api/cart/clear', { method: 'POST' });
        // loadCartFromServer(); // Server should return empty cart
      } catch (error) {
        console.error('Failed to sync clear cart with server:', error);
        showNotification('Failed to sync cart with server.', 'error');
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
        items: state.items,
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