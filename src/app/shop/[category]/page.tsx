import React from 'react';
import { StoreRepository } from '@/lib/db/store';
import { ProductCard } from '@/components/product/ProductCard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

const CATEGORY_META: Record<string, { title: string; subtitle: string; description: string }> = {
  't-shirts': {
    title: 'Classic & Heavyweight T-Shirts',
    subtitle: '220 - 240 GSM Ring-Spun Cotton',
    description: 'Constructed with dense knit cotton, non-sag ribbed collars, and clean drape tailored for high-res DTG printing.',
  },
  'hoodies': {
    title: '400 GSM Archival Heavy Hoodies',
    subtitle: 'Brushed Fleece • Double-Layered Hoods',
    description: 'Heavy architectural hoodies engineered for cold climates and structured streetwear drapes. Zero drawstrings for a modern aesthetic.',
  },
  'oversized': {
    title: 'Oversized & Drop-Shoulder Fits',
    subtitle: 'Boxy Mineral Wash & Cyber Silhouettes',
    description: 'Generous proportions with exaggerated shoulder drops. The ultimate canvas for large back graphics and brutalist typography.',
  },
  'polo': {
    title: 'Signature Supima Cotton Polos',
    subtitle: 'Mercerized Pique Knit Luxury',
    description: 'Smart-casual precision crafted with mother-of-pearl buttons and anti-curl collar construction.',
  },
  'shirts': {
    title: 'Resort & Casual Button-Down Shirts',
    subtitle: 'Linen & Tencel Breathable Blends',
    description: 'Fluid Cuban collars and tailored everyday luxury shirts for relaxed warm-weather elegance.',
  },
  'sweatshirts': {
    title: 'Core Crewneck Sweatshirts',
    subtitle: '340 GSM Brushed French Terry',
    description: 'Athletic collegiate heritage crewnecks with vintage V-stitch neck inserts and heavy ribbed cuffs.',
  },
  'bottoms': {
    title: 'Denim, Trousers & Sweat Shorts',
    subtitle: '13.5 Oz Raw Denim & Heavy Twill Chinos',
    description: 'Relaxed skater denim, double-pleated tailored chinos, and heavyweight cotton lounge shorts.',
  },
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const meta = CATEGORY_META[category] || {
    title: category.toUpperCase().replace('-', ' '),
    subtitle: 'Curated Silhouettes',
    description: 'Explore verified garments engineered for comfort and durability.',
  };

  const allProducts = StoreRepository.getAllProducts();
  const products = allProducts.filter((p) => {
    if (category === 'bottoms') {
      return p.category === 'jeans' || p.category === 'trousers' || p.category === 'shorts';
    }
    return p.category === category;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Category Header */}
      <div className="mb-8 pb-6 border-b border-canvas-border">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-gray hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Categories
        </Link>
        <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
          {meta.subtitle}
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
          {meta.title}
        </h1>
        <p className="text-xs sm:text-sm text-brand-gray max-w-2xl mt-2 leading-relaxed">
          {meta.description}
        </p>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 bg-canvas-card border border-canvas-border rounded-xl">
          <p className="text-sm text-brand-gray mb-4">No products found in this category right now.</p>
          <Link
            href="/shop"
            className="px-4 py-2 bg-brand-lime text-black font-semibold text-xs rounded-lg"
          >
            Explore Other Categories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
