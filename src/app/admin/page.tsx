'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StoreRepository } from '@/lib/db/store';
import { formatINR } from '@/lib/currency';
import {
  ShoppingBag,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const analytics = StoreRepository.getAnalytics();

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 bg-canvas-card border border-canvas-border rounded-xl space-y-2 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-mono text-brand-gray">
            <span>Gross Sales (INR)</span>
            <TrendingUp className="w-4 h-4 text-brand-lime" />
          </div>
          <div className="text-2xl font-black font-mono text-brand-lime">
            {formatINR(analytics.totalRevenuePaise)}
          </div>
          <div className="text-[11px] text-brand-gray">Verified transaction volume</div>
        </div>

        {/* Order Count */}
        <div className="p-5 bg-canvas-card border border-canvas-border rounded-xl space-y-2 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-mono text-brand-gray">
            <span>Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {analytics.totalOrders}
          </div>
          <div className="text-[11px] text-brand-gray">Fulfilment queue items</div>
        </div>

        {/* AOV */}
        <div className="p-5 bg-canvas-card border border-canvas-border rounded-xl space-y-2 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-mono text-brand-gray">
            <span>Average Order Value</span>
            <span className="text-brand-lime font-mono text-xs">₹</span>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {formatINR(analytics.aovPaise)}
          </div>
          <div className="text-[11px] text-brand-gray">Per active transaction</div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 bg-canvas-card border border-canvas-border rounded-xl space-y-2 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-mono text-brand-gray">
            <span>Low Stock Variants</span>
            <AlertTriangle className="w-4 h-4 text-brand-accent" />
          </div>
          <div className="text-2xl font-black font-mono text-brand-accent">
            {analytics.lowStockCount}
          </div>
          <div className="text-[11px] text-brand-gray">Variants below 12 units</div>
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-8 bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Recent Customer Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs font-mono text-brand-lime hover:underline flex items-center gap-1"
            >
              Manage all orders <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="border-b border-canvas-border text-brand-gray">
                  <th className="py-2.5">Order Ref</th>
                  <th className="py-2.5">Customer</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Items</th>
                  <th className="py-2.5 text-right">Total</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-border/50 text-white">
                {analytics.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-canvas-dark/40">
                    <td className="py-3 font-bold text-brand-lime">{order.orderNumber}</td>
                    <td className="py-3 text-brand-gray truncate max-w-[140px]">
                      {order.shippingAddress.fullName}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-brand-gray">{order.items.length} garments</td>
                    <td className="py-3 text-right font-bold">{formatINR(order.totalPayablePaise)}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/orders`}
                        className="text-brand-lime hover:underline text-[11px]"
                      >
                        Inspect Proof
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning Box */}
        <div className="lg:col-span-4 bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-brand-accent" />
              Inventory Replenishment
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            {analytics.lowStockVariants.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-canvas-dark border border-canvas-border rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-white truncate max-w-[180px]">{item.productName}</div>
                  <div className="text-[11px] text-brand-gray font-mono">
                    {item.color} • Size {item.size}
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-brand-accent text-xs">
                  {item.stock} left
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
