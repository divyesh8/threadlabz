import React from 'react';
import { StoreRepository } from '@/lib/db/store';
import { DesignStudio } from '@/components/studio/DesignStudio';

interface DesignStudioPageProps {
  searchParams: Promise<{ product?: string; design?: string }>;
}

export default async function DesignStudioPage({ searchParams }: DesignStudioPageProps) {
  const { product: productId, design: designId } = await searchParams;

  const allProducts = StoreRepository.getAllProducts();
  const customizableProducts = allProducts.filter((p) => p.isCustomizable);

  const initialProduct =
    customizableProducts.find((p) => p.id === productId) ||
    customizableProducts[0] ||
    allProducts[0];

  const initialDesign = designId ? StoreRepository.getDesignById(designId) : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Studio Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-canvas-border pb-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-brand-lime flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse inline-block" />
            Interactive Garment Studio // 300 DPI Vector Canvas
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Custom Apparel Micro-Factory
          </h1>
        </div>
        <div className="text-[11px] font-mono text-brand-gray">
          Micro-Factory: Direct-to-Garment (DTG) • Bengaluru Micro-Hub
        </div>
      </div>

      <DesignStudio
        initialProduct={initialProduct}
        allCustomizableProducts={customizableProducts}
        initialDesign={initialDesign}
      />
    </div>
  );
}
