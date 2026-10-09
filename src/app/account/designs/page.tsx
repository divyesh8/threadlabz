'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StoreRepository } from '@/lib/db/store';
import { useCart } from '@/context/CartContext';
import { DesignDocument } from '@/types/studio';
import { formatINR } from '@/lib/currency';
import { generateId } from '@/lib/utils';
import { Sparkles, Trash2, ShoppingBag, ArrowLeft, ExternalLink } from 'lucide-react';

export default function AccountDesignsPage() {
  const [designs, setDesigns] = useState<DesignDocument[]>(StoreRepository.getSavedDesigns());
  const { addItem } = useCart();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('Delete this saved custom design?')) {
      StoreRepository.deleteDesign(id);
      setDesigns(StoreRepository.getSavedDesigns());
    }
  };

  const handleQuickAdd = (design: DesignDocument) => {
    const product = StoreRepository.getProductById(design.productId) || StoreRepository.getAllProducts()[0];
    const fee = (design.frontElements.length > 0 ? 1 : 0) + (design.backElements.length > 0 ? 1 : 0);
    const feePaise = fee * product.customizationFeePaise;

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      variantId: `${product.id}-blk-l`,
      size: 'L',
      colorName: design.garmentColor || 'Jet Black',
      colorHex: design.garmentColorHex || '#111215',
      garmentImage: product.images[0] || '',
      quantity: 1,
      unitPricePaise: product.basePricePaise,
      customizationFeePaise: feePaise,
      isCustomized: true,
      customization: {
        designId: design.id,
        designTitle: design.title,
        designDocument: design,
        elementCount: design.frontElements.length + design.backElements.length,
      },
    });

    setToastMsg(`Added "${design.title}" to bag!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-dark text-white border border-brand-lime px-4 py-3 rounded-lg shadow-glow text-xs">
          {toastMsg}
        </div>
      )}

      <div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-gray hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Account
        </Link>
        <h1 className="text-3xl font-black text-white tracking-tight">Saved Custom Designs</h1>
        <p className="text-xs text-brand-gray mt-1">
          Reopen, modify, or order from your personal studio artwork archive
        </p>
      </div>

      {designs.length === 0 ? (
        <div className="p-16 text-center bg-canvas-card border border-canvas-border rounded-xl max-w-lg mx-auto">
          <Sparkles className="w-12 h-12 text-brand-lime/40 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-white mb-1">No Saved Designs Yet</h2>
          <p className="text-xs text-brand-gray mb-6">
            Create an original streetwear piece in our 2D studio and click "Save Design for Later".
          </p>
          <Link
            href="/design-studio"
            className="px-6 py-2.5 bg-brand-lime text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-glow"
          >
            Open Design Studio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {designs.map((design) => {
            const product = StoreRepository.getProductById(design.productId);
            const totalElements = design.frontElements.length + design.backElements.length;

            return (
              <div
                key={design.id}
                className="p-5 bg-canvas-card border border-canvas-border rounded-xl space-y-4 shadow-subtle flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-brand-lime uppercase bg-brand-lime/10 px-2 py-0.5 rounded border border-brand-lime/30">
                      {design.garmentColor}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(design.id)}
                      className="text-brand-gray hover:text-brand-accent transition-colors p-1"
                      title="Delete Design"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mt-2">{design.title}</h3>
                  <div className="text-xs text-brand-gray font-mono mt-1">
                    Silhouette: {product?.name || design.productName}
                  </div>
                  <div className="text-[11px] text-brand-gray mt-0.5">
                    {totalElements} custom vector/text elements • Updated{' '}
                    {new Date(design.updatedAt).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-canvas-border">
                  <Link
                    href={`/design-studio/${design.id}`}
                    className="flex-1 py-2 px-3 bg-brand-lime hover:bg-brand-lime-hover text-black text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1 shadow-glow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Reopen in Studio
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleQuickAdd(design)}
                    className="p-2 bg-canvas-dark hover:bg-canvas-subtle border border-canvas-border text-white hover:text-brand-lime rounded-lg transition-colors"
                    title="Add to Bag"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
