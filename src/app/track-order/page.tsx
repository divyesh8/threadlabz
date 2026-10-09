'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { StoreRepository } from '@/lib/db/store';
import { Order } from '@/types/order';
import { formatINR } from '@/lib/currency';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  AlertCircle,
} from 'lucide-react';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [orderQuery, setOrderQuery] = useState(initialRef);
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialRef) {
      handleSearch(initialRef);
    }
  }, [initialRef]);

  const handleSearch = (queryToUse?: string) => {
    const q = (queryToUse || orderQuery).trim().toUpperCase();
    if (!q) return;

    setHasSearched(true);
    const found = StoreRepository.getOrderByNumber(q) || StoreRepository.getOrderById(q);
    setSearchedOrder(found || null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
          Real-time Logistics
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Track Your THREADLAB Order
        </h1>
        <p className="text-xs text-brand-gray leading-relaxed">
          Enter your order reference code (e.g. <span className="font-mono text-brand-lime">TL-894210</span>) to check live print proofing, curing, and courier transit.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-canvas-card border border-canvas-border rounded-xl p-4 shadow-subtle flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="e.g. TL-894210"
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-canvas-dark border border-canvas-border rounded-lg pl-9 pr-3 py-3 text-xs sm:text-sm text-white uppercase font-mono focus:border-brand-lime outline-none"
          />
          <Search className="w-4 h-4 text-brand-gray absolute left-3 top-3.5" />
        </div>
        <button
          type="button"
          onClick={() => handleSearch()}
          className="px-6 py-3 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-glow transition-all"
        >
          Track Shipment
        </button>
      </div>

      {/* Result Display */}
      {hasSearched && (
        <>
          {searchedOrder ? (
            <div className="space-y-6">
              {/* Order Status Hero Card */}
              <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-white">
                      {searchedOrder.orderNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-brand-lime text-black">
                      {searchedOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-brand-gray mt-1">
                    Placed on {new Date(searchedOrder.createdAt).toLocaleDateString('en-IN')} • {searchedOrder.items.length} items
                  </p>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <div className="text-[11px] text-brand-gray">Estimated Delivery</div>
                  <div className="text-sm font-bold text-brand-lime">
                    {searchedOrder.estimatedDeliveryDate || '3-5 Business Days'}
                  </div>
                  {searchedOrder.courierName && (
                    <div className="text-[10px] text-brand-gray">
                      Partner: {searchedOrder.courierName}
                    </div>
                  )}
                </div>
              </div>

              {/* Fulfilment Timeline */}
              <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-canvas-border pb-3">
                  Micro-Factory & Courier Timeline
                </h3>
                <div className="space-y-4 pt-1">
                  {searchedOrder.timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            event.completed
                              ? 'bg-brand-lime text-black shadow-glow'
                              : 'bg-canvas-dark text-brand-gray border border-canvas-border'
                          }`}
                        >
                          {event.completed ? '✓' : idx + 1}
                        </span>
                        {idx < searchedOrder.timeline.length - 1 && (
                          <div
                            className={`w-0.5 h-8 my-1 ${
                              event.completed ? 'bg-brand-lime/60' : 'bg-canvas-border'
                            }`}
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{event.title}</div>
                        <div className="text-[11px] text-brand-gray">{event.description}</div>
                        <div className="text-[10px] text-brand-gray/60 font-mono mt-0.5">
                          {new Date(event.timestamp).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items in this Order */}
              <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-canvas-border pb-3">
                  Garment Items
                </h3>
                <div className="divide-y divide-canvas-border">
                  {searchedOrder.items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.garmentImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=100'}
                          alt={item.productName}
                          className="w-12 h-14 object-cover rounded bg-canvas-dark border border-canvas-border"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{item.productName}</div>
                          <div className="text-[11px] text-brand-gray font-mono">
                            {item.colorName} • Size {item.size} • Qty {item.quantity}
                          </div>
                          {item.isCustomized && (
                            <div className="text-[10px] text-brand-lime font-mono">
                              ✓ Custom Print: {item.customization?.designTitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-mono font-bold text-white">
                        {formatINR(item.totalPaise)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-canvas-card border border-canvas-border rounded-xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-brand-accent mx-auto" />
              <div className="text-sm font-bold text-white">No Order Found for "{orderQuery}"</div>
              <p className="text-xs text-brand-gray max-w-sm mx-auto">
                Please verify your order number format (e.g. TL-894210) from your confirmation email, or check your account order history.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-20 text-center font-mono text-xs text-brand-gray">
          Loading Order Tracker...
        </div>
      }
    >
      <TrackOrderContent />
    </React.Suspense>
  );
}
