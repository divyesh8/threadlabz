import React from 'react';
import { StoreRepository } from '@/lib/db/store';
import { DesignStudio } from '@/components/studio/DesignStudio';
import { notFound } from 'next/navigation';

interface StudioDesignRouteProps {
  params: Promise<{ designId: string }>;
}

export default async function StudioDesignRoute({ params }: StudioDesignRouteProps) {
  const { designId } = await params;
  const design = StoreRepository.getDesignById(designId);

  const allProducts = StoreRepository.getAllProducts();
  const customizableProducts = allProducts.filter((p) => p.isCustomizable);

  const product = design
    ? StoreRepository.getProductById(design.productId) || customizableProducts[0]
    : customizableProducts[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-canvas-border pb-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
            Saved Design: {design?.title || 'Custom Workspace'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Studio Canvas Workspace
          </h1>
        </div>
      </div>

      <DesignStudio
        initialProduct={product}
        allCustomizableProducts={customizableProducts}
        initialDesign={design}
      />
    </div>
  );
}
