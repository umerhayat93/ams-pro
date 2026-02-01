import React, { createContext, useContext, useState, ReactNode } from 'react';
import { type Product, type Customer } from '@shared/schema';

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  taxRate: number;
  
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (amount: number) => void;
  setTaxRate: (rate: number) => void;
  clearCart: () => void;
  
  subtotal: number;
  taxAmount: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0); // Percentage

  const addToCart = (product: Product) => {
    setItems(current => {
      const existing = current.find(item => item.id === product.id);
      if (existing) {
        return current.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setItems(current => current.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(current => 
      current.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setCustomer(null);
    setDiscount(0);
  };

  const subtotal = items.reduce((sum, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return sum + (price * item.quantity);
  }, 0);

  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const total = Math.max(0, subtotal - discount + taxAmount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      customer,
      discount,
      taxRate,
      addToCart,
      removeFromCart,
      updateQuantity,
      setCustomer,
      setDiscount,
      setTaxRate,
      clearCart,
      subtotal,
      taxAmount,
      total,
      itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
