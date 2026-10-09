'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { StoreRepository } from '@/lib/db/store';
import { ProductCard } from '@/components/product/ProductCard';
import { Heart, ArrowRight } from 'lucide-react';

export default function WishlistPage() {
  const { wishlist } = useAuth();
  const allProducts = StoreRepository.getAllProducts();

  const wishlistedProducts = allProducts.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-canvas-border pb-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Saved Wishlist</h1>
        <p className="text-xs text-brand-gray mt-1">
          {wishlistedProducts.length} items saved for future drops and orders
        </p>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="text-center py-20 bg-canvas-card border border-canvas-border rounded-xl max-w-lg mx-auto p-8">
          <Heart className="w-12 h-12 text-brand-gray/30 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-white mb-1">Your Wishlist is Empty</h2>
          <p className="text-xs text-brand-gray mb-6">
            Click the heart icon on any garment to save your favorite fits and colorways.
          </p>
          <Link
            href="/shop"
            className="px-6 py-2.5 bg-brand-lime text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-glow"
          >
            Explore Catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlistedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
