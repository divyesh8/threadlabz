'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types/product';
import { formatINR } from '@/lib/currency';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Heart, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useAuth();
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || { name: 'Black', hex: '#111215', code: 'BLK' });
  const [isHovered, setIsHovered] = useState(false);

  const isFavorited = isInWishlist(product.id);

  // Discount percentage
  const discountPercent = product.comparePricePaise
    ? Math.round(((product.comparePricePaise - product.basePricePaise) / product.comparePricePaise) * 100)
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantId: `${product.id}-${selectedColor.code.toLowerCase()}-l`,
      size: 'L',
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      garmentImage: product.images[0] || '',
      quantity: 1,
      unitPricePaise: product.basePricePaise,
      customizationFeePaise: 0,
      isCustomized: false,
    });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-canvas-card border border-canvas-border hover:border-canvas-border/80 rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-subtle"
    >
      {/* Image Container */}
      <Link href={`/product/${product.slug}`} className="relative aspect-[3/4] w-full overflow-hidden bg-canvas-dark block">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {product.isCustomizable && (
            <span className="bg-black/80 backdrop-blur-md text-brand-lime border border-brand-lime/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-glow">
              <Sparkles className="w-2.5 h-2.5" />
              Customizable
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-brand-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {discountPercent}% OFF
            </span>
          )}
          {product.isNewArrival && (
            <span className="bg-white text-black text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase">
              New Drop
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all ${
            isFavorited
              ? 'bg-brand-accent text-white shadow-md'
              : 'bg-black/60 text-white/70 hover:text-white hover:bg-black/80'
          }`}
          title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Quick Customize Action Overlay on Hover */}
        {product.isCustomizable && (
          <div
            className={`absolute inset-x-3 bottom-3 transition-all duration-200 ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <Link
              href={`/design-studio?product=${product.id}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full py-2.5 bg-brand-lime hover:bg-brand-lime-hover text-black font-bold text-xs font-mono uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 shadow-glow transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Customize in Studio
            </Link>
          </div>
        )}
      </Link>

      {/* Content Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Fit & Category Pill */}
          <div className="flex items-center justify-between text-[11px] font-mono text-brand-gray mb-1">
            <span className="uppercase">{product.category.replace('-', ' ')}</span>
            <span>{product.fit} Fit</span>
          </div>

          <Link href={`/product/${product.slug}`} className="block group-hover:text-brand-lime transition-colors">
            <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
              {product.name}
            </h3>
          </Link>

          <p className="text-[11px] text-brand-gray line-clamp-1 mt-0.5">
            {product.subtitle}
          </p>
        </div>

        {/* Color Dots */}
        <div className="flex items-center gap-1.5">
          {product.colors.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelectedColor(c)}
              style={{ backgroundColor: c.hex }}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                selectedColor.code === c.code ? 'border-brand-lime scale-125' : 'border-white/20'
              }`}
              title={c.name}
            />
          ))}
          <span className="text-[10px] text-brand-gray font-mono ml-1">
            {product.colors.length} colors
          </span>
        </div>

        {/* Price & Quick Add */}
        <div className="flex items-center justify-between pt-2 border-t border-canvas-border">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono font-bold text-white">
              {formatINR(product.basePricePaise)}
            </span>
            {product.comparePricePaise && (
              <span className="text-xs font-mono text-brand-gray line-through">
                {formatINR(product.comparePricePaise)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            className="p-2 rounded-lg bg-canvas-dark hover:bg-canvas-subtle border border-canvas-border text-white hover:text-brand-lime transition-colors"
            title="Quick Add to Bag (Size L)"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
