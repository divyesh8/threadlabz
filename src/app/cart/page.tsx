'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/currency';
import { STORE_CONFIG } from '@/lib/config';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  ArrowLeft,
} from 'lucide-react';

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    pricing,
    promoCodeInput,
    setPromoCodeInput,
    applyPromoCode,
    removePromoCode,
    appliedPromo,
    shippingMethod,
    setShippingMethod,
    totalItemCount,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center">
        <ShoppingBag className="w-16 h-16 text-brand-gray/30 mx-auto mb-4 stroke-1" />
        <h1 className="text-2xl font-bold text-white mb-2">Your Shopping Bag is Empty</h1>
        <p className="text-xs text-brand-gray mb-6 max-w-sm mx-auto">
          Explore our streetwear blanks or jump into the 2D Studio to design your first custom print piece.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/shop"
            className="px-6 py-3 bg-brand-lime text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-glow"
          >
            Explore Ready-Made
          </Link>
          <Link
            href="/design-studio"
            className="px-6 py-3 bg-canvas-card border border-canvas-border hover:border-brand-lime text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
          >
            Design Custom Piece
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-canvas-border pb-4 gap-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Shopping Bag</h1>
          <p className="text-xs text-brand-gray mt-1">
            {totalItemCount} items selected • Dispatched from Bengaluru micro-factory
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-mono text-brand-gray hover:text-brand-accent transition-colors"
        >
          Clear Bag
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-canvas-card border border-canvas-border rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-subtle"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-24 bg-canvas-dark rounded-lg overflow-hidden shrink-0 border border-canvas-border flex items-center justify-center">
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

                <div>
                  <h3 className="text-sm font-bold text-white">{item.productName}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs font-mono text-brand-gray">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      {item.colorName}
                    </span>
                    <span>•</span>
                    <span>Size {item.size}</span>
                  </div>
                  {item.isCustomized && item.customization && (
                    <div className="text-xs text-brand-lime font-mono mt-1">
                      Artwork: {item.customization.designTitle} ({item.customization.elementCount} elements)
                    </div>
                  )}
                </div>
              </div>

              {/* Stepper & Total */}
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-canvas-border/50">
                <div className="flex items-center border border-canvas-border rounded-lg bg-canvas-dark">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1.5 text-brand-gray hover:text-white"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-mono font-bold text-white">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1.5 text-brand-gray hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-white">
                    {formatINR((item.unitPricePaise + item.customizationFeePaise) * item.quantity)}
                  </div>
                  {item.customizationFeePaise > 0 && (
                    <div className="text-[10px] text-brand-gray">
                      incl. {formatINR(item.customizationFeePaise * item.quantity)} print charge
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-brand-gray hover:text-brand-accent p-1"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-lime hover:underline pt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Continue Shopping
          </Link>
        </div>

        {/* Order Summary & Checkout Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-5 shadow-subtle">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-canvas-border pb-3">
              Order Breakdown
            </h3>

            {/* Promo Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="PROMO CODE (e.g. LAB15)"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value)}
                className="flex-1 bg-canvas-dark border border-canvas-border rounded-lg px-3 py-2 text-xs text-white uppercase font-mono focus:border-brand-lime outline-none"
              />
              {appliedPromo ? (
                <button
                  type="button"
                  onClick={removePromoCode}
                  className="px-3 py-2 bg-canvas-subtle text-brand-accent text-xs font-mono rounded-lg"
                >
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => applyPromoCode(promoCodeInput)}
                  className="px-4 py-2 bg-canvas-subtle hover:bg-canvas-border text-white text-xs font-semibold rounded-lg"
                >
                  Apply
                </button>
              )}
            </div>

            {appliedPromo && (
              <div className="text-xs text-brand-lime font-mono flex items-center justify-between">
                <span>✓ {appliedPromo.description}</span>
                <span>-{formatINR(pricing.discountPaise)}</span>
              </div>
            )}

            {/* Breakdown table */}
            <div className="space-y-2 text-xs text-brand-gray pt-2">
              <div className="flex justify-between">
                <span>Garment Items Total</span>
                <span className="font-mono text-white">{formatINR(pricing.itemsSubtotalPaise)}</span>
              </div>
              {pricing.customizationTotalPaise > 0 && (
                <div className="flex justify-between">
                  <span>Custom Print Fees</span>
                  <span className="font-mono text-brand-lime">+{formatINR(pricing.customizationTotalPaise)}</span>
                </div>
              )}
              {pricing.discountPaise > 0 && (
                <div className="flex justify-between text-brand-lime">
                  <span>Promo Discount</span>
                  <span className="font-mono">-{formatINR(pricing.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping ({pricing.isFreeShipping ? 'Free Offer' : 'Standard Delivery'})</span>
                <span className="font-mono text-white">
                  {pricing.isFreeShipping ? 'FREE' : formatINR(pricing.shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-mono text-white">{formatINR(pricing.taxPaise)}</span>
              </div>
              <div className="border-t border-canvas-border pt-3 flex justify-between items-baseline font-bold text-sm text-white">
                <span>Final Payable</span>
                <span className="text-xl text-brand-lime font-mono">
                  {formatINR(pricing.totalPayablePaise)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full py-4 px-6 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Proceed to Secure Checkout
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-brand-gray font-mono pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-lime" />
              <span>Razorpay Secured • Free Returns on Defects</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
