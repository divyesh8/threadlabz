'use client';

import React from 'react';
import { FilterState, GarmentSize, GarmentFit } from '@/types/product';
import { STORE_CONFIG } from '@/lib/config';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';

interface ProductFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  totalProductsCount: number;
}

const AVAILABLE_SIZES: GarmentSize[] = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
const AVAILABLE_FITS: GarmentFit[] = ['Boxy', 'Oversized', 'Relaxed', 'Slim', 'Straight'];
const AVAILABLE_COLORS = [
  'Jet Black',
  'Chalk White',
  'Washed Charcoal',
  'Forest Moss',
  'Vintage Navy',
  'Electric Lime',
  'Sand Dune',
];

export function ProductFilters({
  filters,
  onChange,
  onReset,
  totalProductsCount,
}: ProductFiltersProps) {
  const toggleSize = (size: GarmentSize) => {
    const exists = filters.sizes.includes(size);
    const updated = exists ? filters.sizes.filter((s) => s !== size) : [...filters.sizes, size];
    onChange({ ...filters, sizes: updated });
  };

  const toggleColor = (color: string) => {
    const exists = filters.colors.includes(color);
    const updated = exists ? filters.colors.filter((c) => c !== color) : [...filters.colors, color];
    onChange({ ...filters, colors: updated });
  };

  const toggleFit = (fit: GarmentFit) => {
    const exists = filters.fits.includes(fit);
    const updated = exists ? filters.fits.filter((f) => f !== fit) : [...filters.fits, fit];
    onChange({ ...filters, fits: updated });
  };

  const hasActiveFilters =
    (filters.category && filters.category !== 'all') ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.fits.length > 0 ||
    filters.customizableOnly ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  return (
    <div className="bg-canvas-card border border-canvas-border rounded-xl p-5 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-white">
          <SlidersHorizontal className="w-4 h-4 text-brand-lime" />
          <span>Filters ({totalProductsCount} items)</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-mono text-brand-lime hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div>
        <label className="text-[11px] font-mono uppercase text-brand-gray block mb-2">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...filters, category: 'all' })}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              !filters.category || filters.category === 'all'
                ? 'bg-brand-lime text-black font-bold'
                : 'bg-canvas-dark text-brand-gray hover:text-white border border-canvas-border'
            }`}
          >
            All Items
          </button>
          {STORE_CONFIG.categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onChange({ ...filters, category: cat.slug })}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filters.category === cat.slug
                  ? 'bg-brand-lime text-black font-bold'
                  : 'bg-canvas-dark text-brand-gray hover:text-white border border-canvas-border'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Customizable Only Toggle */}
      <div className="p-3 bg-canvas-dark rounded-lg border border-canvas-border flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">Customizable Only</div>
          <div className="text-[10px] text-brand-gray">Ready for custom 2D studio printing</div>
        </div>
        <input
          type="checkbox"
          checked={!!filters.customizableOnly}
          onChange={(e) => onChange({ ...filters, customizableOnly: e.target.checked })}
          className="w-4 h-4 accent-brand-lime cursor-pointer rounded"
        />
      </div>

      {/* Size Pills */}
      <div>
        <label className="text-[11px] font-mono uppercase text-brand-gray block mb-2">
          Size
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {AVAILABLE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`py-1 text-xs font-mono rounded border transition-colors ${
                filters.sizes.includes(size)
                  ? 'bg-brand-lime text-black font-bold border-brand-lime'
                  : 'bg-canvas-dark text-brand-gray border-canvas-border hover:text-white'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Color Filter */}
      <div>
        <label className="text-[11px] font-mono uppercase text-brand-gray block mb-2">
          Color Shades
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_COLORS.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => toggleColor(col)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                filters.colors.includes(col)
                  ? 'bg-brand-lime text-black font-bold border-brand-lime'
                  : 'bg-canvas-dark text-brand-gray border-canvas-border hover:text-white'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Fit Filter */}
      <div>
        <label className="text-[11px] font-mono uppercase text-brand-gray block mb-2">
          Garment Fit
        </label>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_FITS.map((fit) => (
            <button
              key={fit}
              type="button"
              onClick={() => toggleFit(fit)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                filters.fits.includes(fit)
                  ? 'bg-brand-lime text-black font-bold border-brand-lime'
                  : 'bg-canvas-dark text-brand-gray border-canvas-border hover:text-white'
              }`}
            >
              {fit}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <div className="flex justify-between items-center text-[11px] font-mono text-brand-gray mb-1.5">
          <span>Max Price (₹)</span>
          <span className="text-white font-bold">
            {filters.maxPrice ? `₹${filters.maxPrice}` : 'Up to ₹4,000'}
          </span>
        </div>
        <input
          type="range"
          min={500}
          max={4000}
          step={100}
          value={filters.maxPrice || 4000}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-brand-lime"
        />
      </div>
    </div>
  );
}
