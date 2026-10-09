'use client';

import React, { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { StoreRepository } from '@/lib/db/store';
import { GarmentColor, GarmentSize } from '@/types/product';
import { formatINR } from '@/lib/currency';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ProductCard } from '@/components/product/ProductCard';
import {
  Sparkles,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Ruler,
  Check,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const product = StoreRepository.getProductBySlug(slug);
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useAuth();

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
        <p className="text-xs text-brand-gray mb-6">The product you are looking for may have been archived.</p>
        <Link href="/shop" className="px-6 py-3 bg-brand-lime text-black font-bold text-xs uppercase tracking-wider rounded-lg">
          Back to Catalogue
        </Link>
      </div>
    );
  }

  const [selectedColor, setSelectedColor] = useState<GarmentColor>(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState<GarmentSize>('L');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  const isFavorited = isInWishlist(product.id);

  // Variant check
  const selectedVariant = product.variants.find(
    (v) => v.size === selectedSize && v.colorName === selectedColor.name
  );
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : false;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantId: selectedVariant?.id || `${product.id}-${selectedColor.code.toLowerCase()}-${selectedSize.toLowerCase()}`,
      size: selectedSize,
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      garmentImage: product.images[activeImageIndex] || product.images[0],
      quantity,
      unitPricePaise: product.basePricePaise,
      customizationFeePaise: 0,
      isCustomized: false,
    });

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const relatedProducts = StoreRepository.getAllProducts()
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-mono text-brand-gray">
        <Link href="/" className="hover:text-white">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/shop" className="hover:text-white">Shop</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/shop/${product.category}`} className="hover:text-white capitalize">
          {product.category.replace('-', ' ')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white truncate">{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-canvas-card border border-canvas-border flex items-center justify-center">
            <img
              src={product.images[activeImageIndex] || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.isCustomizable && (
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-brand-lime/40 text-brand-lime text-xs font-mono font-bold px-3 py-1 rounded-full shadow-glow flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Custom Studio Eligible
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    activeImageIndex === idx ? 'border-brand-lime scale-105' : 'border-canvas-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-brand-gray mb-1">
              <span className="uppercase">{product.category.replace('-', ' ')}</span>
              <span>{product.fit} Fit • {product.gsm ? `${product.gsm} GSM` : 'Heavyweight'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {product.name}
            </h1>
            <p className="text-xs text-brand-gray mt-1 leading-relaxed">
              {product.subtitle}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 pb-4 border-b border-canvas-border">
            <span className="text-2xl sm:text-3xl font-mono font-black text-brand-lime">
              {formatINR(product.basePricePaise)}
            </span>
            {product.comparePricePaise && (
              <span className="text-sm font-mono text-brand-gray line-through">
                {formatINR(product.comparePricePaise)}
              </span>
            )}
            <span className="text-[11px] font-mono text-brand-gray">
              (Includes applicable GST)
            </span>
          </div>

          {/* Color Selector */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-mono uppercase text-brand-gray">Color</span>
              <span className="text-white font-semibold">{selectedColor.name}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor.code === c.code
                      ? 'border-brand-lime scale-110 shadow-glow'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Size Selector & Size Chart Trigger */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-mono uppercase text-brand-gray">Size</span>
              <button
                type="button"
                onClick={() => setShowSizeChart(true)}
                className="text-brand-lime hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                <Ruler className="w-3.5 h-3.5" />
                Size Matrix
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`py-2 text-xs font-mono font-bold rounded-lg border transition-all ${
                    selectedSize === s
                      ? 'bg-brand-lime text-black border-brand-lime'
                      : 'bg-canvas-card text-brand-gray border-canvas-border hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {selectedVariant && (
              <div className="text-[10px] font-mono text-brand-gray mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-lime inline-block" />
                <span>In Stock ({selectedVariant.stock} units at Bengaluru warehouse)</span>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono uppercase text-brand-gray">Quantity</span>
            <div className="flex items-center border border-canvas-border rounded-lg bg-canvas-card">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-brand-gray hover:text-white"
              >
                -
              </button>
              <span className="px-3 text-xs font-mono text-white font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-1.5 text-brand-gray hover:text-white"
              >
                +
              </button>
            </div>
          </div>

          {/* CTAs: Custom Studio & Add to Bag */}
          <div className="space-y-3 pt-2">
            {product.isCustomizable && (
              <Link
                href={`/design-studio?product=${product.id}`}
                className="w-full py-4 px-6 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Customize in 2D Studio Canvas (+₹{product.customizationFeePaise / 100})
              </Link>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 py-3.5 px-6 bg-canvas-card hover:bg-canvas-subtle border border-canvas-border hover:border-white text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                {isOutOfStock ? 'Variant Out of Stock' : 'Add Ready-Made to Bag'}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`p-3.5 rounded-xl border transition-all ${
                  isFavorited
                    ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                    : 'border-canvas-border bg-canvas-card text-brand-gray hover:text-white'
                }`}
                title="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Description & Care Accordion */}
          <div className="p-4 bg-canvas-card border border-canvas-border rounded-xl space-y-3 text-xs text-brand-gray">
            <h4 className="font-bold text-white uppercase font-mono text-[11px]">
              Garment Specifications
            </h4>
            <p className="leading-relaxed">{product.description}</p>
            <div className="border-t border-canvas-border pt-2 space-y-1 text-[11px]">
              <div><strong className="text-white">Fabric:</strong> {product.fabric}</div>
              <div><strong className="text-white">Fit:</strong> {product.fit} Cut</div>
              <div>
                <strong className="text-white">Care:</strong> {product.careInstructions.join(' • ')}
              </div>
            </div>
          </div>

          {/* Delivery & Assurance */}
          <div className="grid grid-cols-2 gap-3 text-xs text-brand-gray">
            <div className="p-3 bg-canvas-card border border-canvas-border rounded-xl flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-brand-lime shrink-0" />
              <span>Ships in 24-48 hrs across India</span>
            </div>
            <div className="p-3 bg-canvas-card border border-canvas-border rounded-xl flex items-center gap-2.5">
              <RotateCcw className="w-4 h-4 text-brand-lime shrink-0" />
              <span>14-day hassle-free returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Size Chart Modal */}
      {showSizeChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-canvas-card border border-canvas-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-canvas-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                {product.name} — Size Matrix (Inches)
              </h3>
              <button
                type="button"
                onClick={() => setShowSizeChart(false)}
                className="text-brand-gray hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b border-canvas-border text-brand-lime">
                    <th className="py-2">Size</th>
                    <th className="py-2">Chest</th>
                    <th className="py-2">Length</th>
                    <th className="py-2">Shoulder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-border/50 text-white">
                  <tr><td className="py-2">XS</td><td>38"</td><td>27"</td><td>18"</td></tr>
                  <tr><td className="py-2">S</td><td>40"</td><td>28"</td><td>19"</td></tr>
                  <tr><td className="py-2">M</td><td>42"</td><td>29"</td><td>20"</td></tr>
                  <tr><td className="py-2 font-bold text-brand-lime">L (Popular)</td><td className="font-bold text-brand-lime">44"</td><td className="font-bold text-brand-lime">30"</td><td className="font-bold text-brand-lime">21"</td></tr>
                  <tr><td className="py-2">XL</td><td>46"</td><td>31"</td><td>22"</td></tr>
                  <tr><td className="py-2">2XL</td><td>48"</td><td>32"</td><td>23"</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-brand-gray">
              Measurements taken flat. For an oversized drop aesthetic, consider staying true to size as our silhouettes are naturally roomier.
            </p>
          </div>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-canvas-border space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight">
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
