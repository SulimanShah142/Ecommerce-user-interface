import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  selectedSize: string;   
  selectedColor: string;  
};

type CartState = {
  items: CartItem[];
};

type CartAction =

  | { type: 'ADD_TO_CART'; payload: { product: any; quantity: number; selectedSize: string; selectedColor: string } }
  | { type: 'REMOVE_FROM_CART'; payload: { id: string; selectedSize: string; selectedColor: string } }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  addToCart: (product: any, quantity: number, size: string, color: string) => void;
  removeFromCart: (id: string, size: string, color: string) => void;
  clearCart: () => void;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const { product, quantity, selectedSize, selectedColor } = action.payload;
      
      const existingItemIdx = state.items.findIndex(
        (item) => 
          item.id === product.id && 
          item.selectedSize === selectedSize && 
          item.selectedColor === selectedColor
      );

      if (existingItemIdx > -1) {
        const newItems = [...state.items];
        newItems[existingItemIdx].quantity += quantity;
        return { ...state, items: newItems };
      }

      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price || product.retailPrice || '0'),
        imageUrl: product.imageUrl,
        quantity: quantity,
        selectedSize: selectedSize || 'M',
        selectedColor: selectedColor || 'Standard',
      };

      return { ...state, items: [...state.items, newItem] };
    }

    case 'REMOVE_FROM_CART': {
      const { id, selectedSize, selectedColor } = action.payload;
      return {
        ...state,
        items: state.items.filter(
          (item) => 
            !(item.id === id && item.selectedSize === selectedSize && item.selectedColor === selectedColor)
        ),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // 🎯 THE FIX: Ensure useReducer outputs exactly [state, dispatch] down to your callback loops
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addToCart = useCallback((product: any, quantity: number, selectedSize: string, selectedColor: string) => {
    dispatch({ 
      type: 'ADD_TO_CART', 
      payload: { product, quantity, selectedSize, selectedColor } 
    });
  }, []);

  const removeFromCart = useCallback((id: string, selectedSize: string, selectedColor: string) => {
    dispatch({ 
      type: 'REMOVE_FROM_CART', 
      payload: { id, selectedSize, selectedColor } 
    });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const contextValue = useMemo(() => ({
    state,
    addToCart,
    removeFromCart,
    clearCart
  }), [state, addToCart, removeFromCart, clearCart]);

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
