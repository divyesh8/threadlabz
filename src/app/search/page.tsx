'use client';

import React, { useState } from 'react';
import { StoreRepository } from '@/lib/db/store';
import { ProductCard } from '@/components/product/ProductCard';
import { Search, Sparkles } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const allProducts = StoreRepository.getAllProducts();

  const results = query.trim()
    ? StoreRepository.filterProducts({
        searchQuery: query,
        colors: [],
        sizes: [],
        fits: [],
        sort: 'popular',
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-3xl font-black text-white tracking-tight">
          Search THREADLAB
        </h1>
        <div className="relative">
          <input
            type="text"
            autoFocus
            placeholder="Search heavyweight t-shirts, acid wash, 400 GSM hoodies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-canvas-card border border-canvas-border focus:border-brand-lime rounded-xl pl-12 pr-4 py-4 text-sm text-white outline-none shadow-2xl font-mono"
          />
          <Search className="w-5 h-5 text-brand-gray absolute left-4 top-4.5" />
        </div>

        {/* Quick Search Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
          <span className="text-brand-gray">Trending searches:</span>
          {['Heavyweight', 'Oversized', 'Hoodie', 'Customizable', 'Acid Wash', 'Supima'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className="px-2.5 py-1 rounded bg-canvas-card hover:bg-canvas-subtle border border-canvas-border text-brand-lime transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {query.trim() && (
        <div className="space-y-4">
          <div className="text-xs font-mono text-brand-gray">
            Found {results.length} results matching "{query}":
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12 bg-canvas-card border border-canvas-border rounded-xl">
              <p className="text-sm text-brand-gray mb-2">No matching silhouettes found.</p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-brand-lime hover:underline font-mono"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
