'use client';

import React, { useState } from 'react';
import { StoreRepository } from '@/lib/db/store';
import { Order, OrderStatus } from '@/types/order';
import { formatINR } from '@/lib/currency';
import {
  Search,
  Filter,
  CheckCircle,
  Truck,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
} from 'lucide-react';

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'processing',
  'design_verification',
  'in_production',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(StoreRepository.getAllOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);

  const [newTracking, setNewTracking] = useState('');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.shippingAddress.fullName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    const updated = StoreRepository.updateOrderStatus(
      orderId,
      newStatus,
      `Status Advanced to ${newStatus.replace('_', ' ').toUpperCase()}`,
      `Order status updated in micro-factory administration portal`,
      newTracking || undefined
    );
    if (updated) {
      setOrders(StoreRepository.getAllOrders());
      setInspectingOrder(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Status Filters */}
      <div className="bg-canvas-card border border-canvas-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search Order Ref or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-canvas-dark border border-canvas-border rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-brand-lime outline-none font-mono"
          />
          <Search className="w-3.5 h-3.5 text-brand-gray absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-brand-lime" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-canvas-dark border border-canvas-border rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
          >
            <option value="all">All Statuses ({orders.length})</option>
            {ORDER_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-canvas-card border border-canvas-border rounded-xl overflow-hidden shadow-subtle">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-canvas-border bg-canvas-dark/60 text-brand-gray">
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Custom Prints</th>
                <th className="py-3 px-4 text-right">Payable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-canvas-border/50 text-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-brand-gray">
                    No orders match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const hasCustom = order.items.some((i) => i.isCustomized);

                  return (
                    <tr key={order.id} className="hover:bg-canvas-dark/40">
                      <td className="py-3.5 px-4 font-bold text-brand-lime">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{order.shippingAddress.fullName}</div>
                        <div className="text-[10px] text-brand-gray">{order.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-brand-gray text-[11px]">
                        {new Date(order.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-lime/10 text-brand-lime border border-brand-lime/30">
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {hasCustom ? (
                          <span className="text-[10px] text-brand-lime font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Artwork Proof Ready
                          </span>
                        ) : (
                          <span className="text-[10px] text-brand-gray">Standard Garment</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        {formatINR(order.totalPayablePaise)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectingOrder(order);
                            setNewTracking(order.trackingNumber || '');
                          }}
                          className="px-2.5 py-1 bg-brand-lime text-black font-bold rounded text-[11px] shadow-sm hover:scale-105 transition-all"
                        >
                          Inspect / Update
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect & Fulfilment Modal */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-canvas-card border border-canvas-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-canvas-border pb-3">
              <div>
                <span className="text-xs font-mono text-brand-lime uppercase font-bold">
                  Order Management
                </span>
                <h3 className="text-base font-bold text-white font-mono">
                  {inspectingOrder.orderNumber} — Fulfilment & Production
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="text-brand-gray hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Advance Status Form */}
            <div className="p-4 bg-canvas-dark border border-canvas-border rounded-xl space-y-3">
              <div className="text-xs font-bold text-white uppercase font-mono">
                Update Production Status
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">Status</label>
                  <select
                    value={inspectingOrder.status}
                    onChange={(e) => handleUpdateStatus(inspectingOrder.id, e.target.value as OrderStatus)}
                    className="w-full bg-canvas-card border border-canvas-border rounded p-2 text-xs text-white font-mono focus:border-brand-lime outline-none"
                  >
                    {ORDER_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">Tracking Number (AWB)</label>
                  <input
                    type="text"
                    placeholder="e.g. TL-BLR-982144"
                    value={newTracking}
                    onChange={(e) => setNewTracking(e.target.value)}
                    className="w-full bg-canvas-card border border-canvas-border rounded p-2 text-xs text-white font-mono focus:border-brand-lime outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Inspect Customer Approved Designs */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-white uppercase font-mono">
                Garments & Customer Print Proofs
              </div>
              <div className="space-y-3">
                {inspectingOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-canvas-dark border border-canvas-border rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white">{item.productName}</div>
                        <div className="text-[11px] text-brand-gray font-mono">
                          Color: {item.colorName} • Size: {item.size} • Qty: {item.quantity}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-brand-lime">
                        {formatINR(item.totalPaise)}
                      </div>
                    </div>

                    {item.isCustomized && item.customization && (
                      <div className="mt-2 p-2.5 bg-canvas-card rounded border border-brand-lime/30 space-y-1 font-mono text-[11px]">
                        <div className="text-brand-lime font-bold flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Artwork Spec: {item.customization.designTitle}
                        </div>
                        <div className="text-brand-gray">
                          Total Layers: {item.customization.elementCount} vector/text elements
                        </div>
                        {item.customization.designDocument.frontElements.length > 0 && (
                          <div className="text-[10px] text-white">
                            Front Elements:{' '}
                            {item.customization.designDocument.frontElements.map((e) => e.name).join(', ')}
                          </div>
                        )}
                        {item.customization.designDocument.backElements.length > 0 && (
                          <div className="text-[10px] text-white">
                            Back Elements:{' '}
                            {item.customization.designDocument.backElements.map((e) => e.name).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="p-3 bg-canvas-dark border border-canvas-border rounded-xl text-xs space-y-1">
              <div className="font-mono text-brand-gray uppercase text-[10px]">Shipping Destination</div>
              <div className="font-bold text-white">{inspectingOrder.shippingAddress.fullName}</div>
              <div className="text-brand-gray">
                {inspectingOrder.shippingAddress.addressLine}, {inspectingOrder.shippingAddress.city},{' '}
                {inspectingOrder.shippingAddress.state} — {inspectingOrder.shippingAddress.pinCode}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
