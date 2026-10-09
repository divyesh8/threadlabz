'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StoreRepository } from '@/lib/db/store';
import { Product } from '@/types/product';
import { formatINR } from '@/lib/currency';
import { Package, Sparkles, Check, Plus, Edit } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(StoreRepository.getAllProducts());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-canvas-card border border-canvas-border rounded-xl p-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono">
            Catalogue & Inventory Manager
          </h2>
          <p className="text-xs text-brand-gray">
            {products.length} products across 9 silhouettes with micro-factory print area configurations
          </p>
        </div>
      </div>

      <div className="bg-canvas-card border border-canvas-border rounded-xl overflow-hidden shadow-subtle">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-canvas-border bg-canvas-dark/60 text-brand-gray">
                <th className="py-3 px-4">Silhouette Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Base Price</th>
                <th className="py-3 px-4">Custom Studio</th>
                <th className="py-3 px-4">Total Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-canvas-border/50 text-white">
              {products.map((p) => {
                const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);

                return (
                  <tr key={p.id} className="hover:bg-canvas-dark/40">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-brand-gray">{p.fabric}</div>
                    </td>
                    <td className="py-3.5 px-4 text-brand-gray uppercase">{p.category}</td>
                    <td className="py-3.5 px-4 font-bold text-brand-lime">
                      {formatINR(p.basePricePaise)}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.isCustomizable ? (
                        <span className="text-brand-lime font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Enabled (+₹{p.customizationFeePaise / 100})
                        </span>
                      ) : (
                        <span className="text-brand-gray">Disabled</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold">{totalStock} units</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/product/${p.slug}`}
                        className="text-brand-lime hover:underline text-[11px]"
                      >
                        Storefront Page
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
