import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { type InventoryItem, type Customer } from '@shared/schema';

export interface CartItem {
  inventoryItem: InventoryItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  customer: Customer | null;
  
  addToCart: (item: InventoryItem, qty?: number) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number, maxStock: number) => boolean;
  incrementQuantity: (itemId: number, maxStock: number) => boolean;
  decrementQuantity: (itemId: number) => void;
  setCustomer: (customer: Customer | null) => void;
  clearCart: () => void;
  
  getQuantity: (itemId: number) => number;
  subtotal: number;
  itemCount: number;
  hasItems: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const addToCart = useCallback((inventoryItem: InventoryItem, qty: number = 1) => {
    setItems(current => {
      const existing = current.find(item => item.inventoryItem.id === inventoryItem.id);
      if (existing) {
        return current.map(item => 
          item.inventoryItem.id === inventoryItem.id 
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...current, { inventoryItem, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: number) => {
    setItems(current => current.filter(item => item.inventoryItem.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: number, quantity: number, maxStock: number): boolean => {
    if (quantity > maxStock) return false;
    
    if (quantity <= 0) {
      removeFromCart(itemId);
      return true;
    }
    
    setItems(current => 
      current.map(item => 
        item.inventoryItem.id === itemId ? { ...item, quantity } : item
      )
    );
    return true;
  }, [removeFromCart]);

  const incrementQuantity = useCallback((itemId: number, maxStock: number): boolean => {
    const currentItem = items.find(i => i.inventoryItem.id === itemId);
    const currentQty = currentItem?.quantity || 0;
    
    if (currentQty >= maxStock) return false;
    
    setItems(current => {
      const existing = current.find(item => item.inventoryItem.id === itemId);
      if (!existing) return current;
      
      return current.map(item => 
        item.inventoryItem.id === itemId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });
    return true;
  }, [items]);

  const decrementQuantity = useCallback((itemId: number) => {
    setItems(current => {
      const existing = current.find(item => item.inventoryItem.id === itemId);
      if (!existing) return current;
      
      if (existing.quantity <= 1) {
        return current.filter(item => item.inventoryItem.id !== itemId);
      }
      
      return current.map(item => 
        item.inventoryItem.id === itemId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  }, []);

  const getQuantity = useCallback((itemId: number): number => {
    const item = items.find(i => i.inventoryItem.id === itemId);
    return item?.quantity || 0;
  }, [items]);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
  }, []);

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.inventoryItem.sellingPrice) || 0;
    return sum + (price * item.quantity);
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = items.length > 0;

  return (
    <CartContext.Provider value={{
      items,
      customer,
      addToCart,
      removeFromCart,
      updateQuantity,
      incrementQuantity,
      decrementQuantity,
      setCustomer,
      clearCart,
      getQuantity,
      subtotal,
      itemCount,
      hasItems,
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
