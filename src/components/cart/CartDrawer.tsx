'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/currency';
import { STORE_CONFIG } from '@/lib/config';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
} from 'lucide-react';

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    pricing,
    promoCodeInput,
    setPromoCodeInput,
    applyPromoCode,
    removePromoCode,
    appliedPromo,
    totalItemCount,
  } = useCart();

  if (!isCartOpen) return null;

  const freeShippingThreshold = STORE_CONFIG.policies.freeShippingThresholdPaise;
  const currentSubtotal = pricing.itemsSubtotalPaise + pricing.customizationTotalPaise;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - currentSubtotal);
  const freeShippingProgress = Math.min(100, Math.round((currentSubtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-canvas-card border-l border-canvas-border flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-canvas-border flex items-center justify-between bg-canvas-dark/40">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-lime" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Your Shopping Bag ({totalItemCount})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-brand-gray hover:text-white hover:bg-canvas-subtle transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-canvas-dark px-4 py-3 border-b border-canvas-border">
            <div className="flex justify-between text-xs mb-1.5 font-mono">
              <span className="text-brand-gray">
                {amountNeededForFreeShipping === 0
                  ? '🎉 You have unlocked FREE Delivery!'
                  : `Add ${formatINR(amountNeededForFreeShipping)} more for FREE Delivery`}
              </span>
              <span className="text-brand-lime font-bold">{freeShippingProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-canvas-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-lime transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <ShoppingBag className="w-12 h-12 text-brand-gray/40 mb-3 stroke-1" />
                <p className="text-sm text-brand-gray mb-4">Your shopping bag is currently empty.</p>
                <Link
                  href="/shop"
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2.5 bg-brand-lime text-black font-semibold text-xs uppercase tracking-wider rounded-lg shadow-glow hover:bg-brand-lime-hover transition-colors"
                >
                  Explore Collection
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-canvas-dark border border-canvas-border rounded-xl"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-24 bg-canvas-subtle rounded-lg overflow-hidden shrink-0 border border-canvas-border flex items-center justify-center">
                    <img
                      src={item.garmentImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200'}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                    {item.isCustomized && (
                      <span className="absolute bottom-1 left-1 bg-brand-lime text-black text-[9px] font-bold px-1 rounded flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        Custom
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-semibold text-white line-clamp-1">
                          {item.productName}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-brand-gray hover:text-brand-accent p-0.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-brand-gray font-mono">
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full inline-block border border-white/20"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          {item.colorName}
                        </span>
                        <span>•</span>
                        <span>Size {item.size}</span>
                      </div>

                      {item.isCustomized && item.customization && (
                        <div className="text-[10px] text-brand-lime font-mono mt-1">
                          Artwork: {item.customization.designTitle} ({item.customization.elementCount} elements)
                        </div>
                      )}
                    </div>

                    {/* Quantity & Price */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-canvas-border/50">
                      <div className="flex items-center border border-canvas-border rounded bg-canvas-card">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-brand-gray hover:text-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-brand-gray hover:text-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">
                          {formatINR((item.unitPricePaise + item.customizationFeePaise) * item.quantity)}
                        </div>
                        {item.customizationFeePaise > 0 && (
                          <div className="text-[9px] text-brand-gray">
                            incl. {formatINR(item.customizationFeePaise * item.quantity)} print fee
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Breakdown */}
          {items.length > 0 && (
            <div className="p-4 border-t border-canvas-border bg-canvas-dark/60 space-y-3">
              {/* Promo Code Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Enter Promo (e.g. LAB15)"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    className="w-full bg-canvas-card border border-canvas-border rounded-lg pl-8 pr-3 py-2 text-xs text-white uppercase font-mono focus:border-brand-lime outline-none"
                  />
                  <Tag className="w-3.5 h-3.5 text-brand-gray absolute left-2.5 top-2.5" />
                </div>
                {appliedPromo ? (
                  <button
                    type="button"
                    onClick={removePromoCode}
                    className="px-3 py-2 bg-canvas-subtle hover:bg-canvas-border text-brand-accent text-xs font-mono rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => applyPromoCode(promoCodeInput)}
                    className="px-4 py-2 bg-canvas-subtle hover:bg-canvas-border text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                )}
              </div>

              {appliedPromo && (
                <div className="text-[11px] text-brand-lime font-mono flex items-center justify-between">
                  <span>✓ {appliedPromo.description}</span>
                  <span>-{formatINR(pricing.discountPaise)}</span>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-brand-gray pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">{formatINR(pricing.itemsSubtotalPaise)}</span>
                </div>
                {pricing.customizationTotalPaise > 0 && (
                  <div className="flex justify-between">
                    <span>Custom Print Studio Charges</span>
                    <span className="font-mono text-brand-lime">+{formatINR(pricing.customizationTotalPaise)}</span>
                  </div>
                )}
                {pricing.discountPaise > 0 && (
                  <div className="flex justify-between text-brand-lime">
                    <span>Discount</span>
                    <span className="font-mono">-{formatINR(pricing.discountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery ({pricing.isFreeShipping ? 'Free Offer' : 'Standard'})</span>
                  <span className="font-mono text-white">
                    {pricing.isFreeShipping ? 'FREE' : formatINR(pricing.shippingPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated GST (5%)</span>
                  <span className="font-mono text-white">{formatINR(pricing.taxPaise)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-canvas-border font-bold text-sm text-white">
                  <span>Final Payable</span>
                  <span className="text-base text-brand-lime font-mono">
                    {formatINR(pricing.totalPayablePaise)}
                  </span>
                </div>
              </div>

              {/* Checkout Action */}
              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-3.5 px-4 bg-brand-lime hover:bg-brand-lime-hover text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow hover:scale-[1.01]"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-brand-gray font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-lime" />
                <span>100% Encrypted Payment • Direct Micro-Factory Fulfilment</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
