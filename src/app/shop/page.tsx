'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { StoreRepository } from '@/lib/db/store';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import { FilterState, GarmentSize, GarmentFit } from '@/types/product';
import { ArrowUpDown, Search, PackageX } from 'lucide-react';

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialQuery = searchParams.get('q') || '';

  const [filters, setFilters] = useState<FilterState>({
    category: initialCategory,
    searchQuery: initialQuery,
    colors: [],
    sizes: [],
    fits: [],
    customizableOnly: false,
    sort: 'newest',
  });

  const filteredProducts = useMemo(() => {
    return StoreRepository.filterProducts(filters);
  }, [filters]);

  const handleReset = () => {
    setFilters({
      category: 'all',
      searchQuery: '',
      colors: [],
      sizes: [],
      fits: [],
      customizableOnly: false,
      sort: 'newest',
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-canvas-border">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
            All Catalogue
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">
            Shop Garments & Blanks
          </h1>
          <p className="text-xs text-brand-gray mt-1">
            Showing {filteredProducts.length} verified products across all silhouettes
          </p>
        </div>

        {/* Search Bar & Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="bg-canvas-card border border-canvas-border rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:border-brand-lime outline-none w-48 sm:w-56"
            />
            <Search className="w-3.5 h-3.5 text-brand-gray absolute left-2.5 top-2.5" />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-canvas-card border border-canvas-border rounded-lg px-3 py-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-brand-lime" />
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value as any })}
              className="bg-transparent text-xs text-white outline-none cursor-pointer font-mono"
            >
              <option value="newest" className="bg-canvas-card">Newest First</option>
              <option value="popular" className="bg-canvas-card">Most Popular</option>
              <option value="price-asc" className="bg-canvas-card">Price: Low to High</option>
              <option value="price-desc" className="bg-canvas-card">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Filters Sidebar */}
        <div className="lg:col-span-1">
          <ProductFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleReset}
            totalProductsCount={filteredProducts.length}
          />
        </div>

        {/* Right Product Grid */}
        <div className="lg:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-canvas-card border border-canvas-border rounded-xl text-center">
              <PackageX className="w-12 h-12 text-brand-gray/40 mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No products match your filters</h3>
              <p className="text-xs text-brand-gray mb-4 max-w-sm">
                Try widening your price range, clearing size or color filters, or searching for a different keyword.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-brand-lime text-black font-semibold text-xs uppercase tracking-wider rounded-lg shadow-glow"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center font-mono text-xs text-brand-gray">
          Loading Garment Catalogue...
        </div>
      }
    >
      <ShopContent />
    </React.Suspense>
  );
}
