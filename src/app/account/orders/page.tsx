'use client';

import React from 'react';
import Link from 'next/link';
import { StoreRepository } from '@/lib/db/store';
import { useAuth } from '@/context/AuthContext';
import { formatINR } from '@/lib/currency';
import { Package, ExternalLink, ArrowLeft, Sparkles } from 'lucide-react';

export default function AccountOrdersPage() {
  const { user } = useAuth();
  const allOrders = StoreRepository.getAllOrders();
  const orders = user
    ? allOrders.filter((o) => o.customerEmail === user.email || o.customerId === user.id)
    : allOrders;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-gray hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Account
        </Link>
        <h1 className="text-3xl font-black text-white tracking-tight">Order History</h1>
        <p className="text-xs text-brand-gray mt-1">
          Review all confirmed custom prints and ready-made orders
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 text-center bg-canvas-card border border-canvas-border rounded-xl">
          <Package className="w-12 h-12 text-brand-gray/30 mx-auto mb-3" />
          <p className="text-sm text-brand-gray mb-4">No order records found.</p>
          <Link href="/shop" className="px-5 py-2.5 bg-brand-lime text-black font-bold text-xs rounded-lg">
            Browse Storefront
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 bg-canvas-card border border-canvas-border rounded-xl space-y-4 shadow-subtle"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-canvas-border gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-brand-lime text-black px-2 py-0.5 rounded font-bold">
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-brand-gray mt-0.5">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono font-bold text-sm text-white">
                    {formatINR(order.totalPayablePaise)}
                  </div>
                  <Link
                    href={`/order-confirmation/${order.orderNumber}`}
                    className="px-3 py-1.5 bg-canvas-dark hover:bg-canvas-subtle border border-canvas-border text-white text-xs font-mono rounded flex items-center gap-1"
                  >
                    View Proof & Tracking <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Items in order */}
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.garmentImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=80'}
                        alt={item.productName}
                        className="w-10 h-12 object-cover rounded bg-canvas-dark border border-canvas-border"
                      />
                      <div>
                        <div className="font-semibold text-white">{item.productName}</div>
                        <div className="text-[11px] text-brand-gray font-mono">
                          {item.colorName} • Size {item.size} • Qty {item.quantity}
                        </div>
                        {item.isCustomized && (
                          <div className="text-[10px] text-brand-lime font-mono">
                            ✓ Custom Studio Print ({item.customization?.designTitle})
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-brand-gray">
                      {formatINR(item.totalPaise)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
