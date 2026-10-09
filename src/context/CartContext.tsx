'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, CartPricingSummary, PromoCode } from '@/types/cart';
import { calculateCartPricing } from '@/lib/pricing';
import { generateId } from '@/lib/utils';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  pricing: CartPricingSummary;
  promoCodeInput: string;
  setPromoCodeInput: (code: string) => void;
  applyPromoCode: (code: string) => { success: boolean; message: string };
  removePromoCode: () => void;
  appliedPromo?: PromoCode;
  shippingMethod: 'standard' | 'express';
  setShippingMethod: (method: 'standard' | 'express') => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  totalItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'threadlab_cart_items';
const PROMO_STORAGE_KEY = 'threadlab_promo_code';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [activePromoCode, setActivePromoCode] = useState<string>('');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
      const storedPromo = localStorage.getItem(PROMO_STORAGE_KEY);
      if (storedPromo) {
        setActivePromoCode(storedPromo);
        setPromoCodeInput(storedPromo);
      }
    } catch (e) {
      console.warn('Error loading cart from storage', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
      if (activePromoCode) {
        localStorage.setItem(PROMO_STORAGE_KEY, activePromoCode);
      } else {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Error saving cart to storage', e);
    }
  }, [items, activePromoCode, isHydrated]);

  const pricing = calculateCartPricing(items, activePromoCode, shippingMethod);

  const addItem = (newItemData: Omit<CartItem, 'id'>) => {
    setItems((prevItems) => {
      // If it's NOT customized, check if the exact same variant is already in cart
      if (!newItemData.isCustomized) {
        const existingIndex = prevItems.findIndex(
          (item) =>
            !item.isCustomized &&
            item.productId === newItemData.productId &&
            item.variantId === newItemData.variantId &&
            item.size === newItemData.size &&
            item.colorName === newItemData.colorName
        );

        if (existingIndex > -1) {
          const updated = [...prevItems];
          updated[existingIndex].quantity += newItemData.quantity;
          return updated;
        }
      }

      // Customized items or novel variants always get a distinct unique cart line
      const lineItem: CartItem = {
        ...newItemData,
        id: generateId('cart'),
      };
      return [...prevItems, lineItem];
    });

    // Auto-open drawer to confirm action
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
    setActivePromoCode('');
    setPromoCodeInput('');
  };

  const applyPromoCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    const testPricing = calculateCartPricing(items, clean, shippingMethod);

    if (testPricing.appliedPromo) {
      setActivePromoCode(clean);
      return {
        success: true,
        message: `Promo code "${clean}" applied successfully! Saved ₹${(testPricing.discountPaise / 100).toFixed(0)}.`,
      };
    } else {
      return {
        success: false,
        message: 'Invalid promo code or minimum order requirements not met.',
      };
    }
  };

  const removePromoCode = () => {
    setActivePromoCode('');
    setPromoCodeInput('');
  };

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        pricing,
        promoCodeInput,
        setPromoCodeInput,
        applyPromoCode,
        removePromoCode,
        appliedPromo: pricing.appliedPromo,
        shippingMethod,
        setShippingMethod,
        isCartOpen,
        setIsCartOpen,
        totalItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
