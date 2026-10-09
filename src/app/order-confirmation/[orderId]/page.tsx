'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StoreRepository } from '@/lib/db/store';
import { formatINR } from '@/lib/currency';
import {
  CheckCircle2,
  Package,
  Clock,
  Truck,
  MapPin,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderNumber = params?.orderId as string;

  const order = StoreRepository.getOrderByNumber(orderNumber) || StoreRepository.getOrderById(orderNumber);

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Order Record Initializing</h2>
        <p className="text-xs text-brand-gray mb-6">
          Looking up order reference <span className="font-mono text-brand-lime">{orderNumber}</span>...
        </p>
        <Link href="/track-order" className="px-6 py-2.5 bg-brand-lime text-black font-bold text-xs rounded-lg">
          Go to Order Tracker
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Success Hero */}
      <div className="bg-canvas-card border border-canvas-border rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="w-16 h-16 bg-brand-lime/10 text-brand-lime border border-brand-lime/40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
          Order Confirmed & Queued
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mt-1">
          Thank you for creating with THREADLAB!
        </h1>
        <p className="text-xs sm:text-sm text-brand-gray mt-2 max-w-lg mx-auto">
          We have received your order <strong className="text-white font-mono">{order.orderNumber}</strong>. A confirmation email and SMS updates have been dispatched to <span className="text-white">{order.customerEmail}</span>.
        </p>

        {order.payment.isDemoSandbox && (
          <div className="mt-4 inline-block px-3 py-1 bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-[11px] font-mono rounded-full">
            Payment Mode: Razorpay Sandbox Verification (Transaction: {order.payment.transactionId})
          </div>
        )}
      </div>

      {/* Order Status & Fulfilment Timeline */}
      <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-canvas-border gap-2">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Fulfilment & Production Timeline
            </h3>
            <span className="text-[11px] text-brand-gray">
              Estimated Delivery: <strong className="text-white font-mono">{order.estimatedDeliveryDate || '3-5 Business Days'}</strong>
            </span>
          </div>
          {order.trackingNumber && (
            <div className="text-xs font-mono text-brand-lime bg-canvas-dark px-3 py-1.5 rounded border border-canvas-border">
              AWB: {order.trackingNumber} ({order.courierName})
            </div>
          )}
        </div>

        {/* Timeline Events */}
        <div className="space-y-4 pt-2">
          {order.timeline.map((event, idx) => (
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
                {idx < order.timeline.length - 1 && (
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

      {/* Items & Print Snapshots */}
      <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-canvas-border pb-3">
          Garment Items ({order.items.length})
        </h3>

        <div className="divide-y divide-canvas-border/60">
          {order.items.map((item) => (
            <div key={item.id} className="py-4 flex flex-col sm:flex-row gap-4 items-start justify-between">
              <div className="flex gap-4">
                <img
                  src={item.garmentImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150'}
                  alt={item.productName}
                  className="w-16 h-20 object-cover rounded-lg bg-canvas-dark border border-canvas-border shrink-0"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">{item.productName}</h4>
                  <div className="text-xs text-brand-gray font-mono mt-0.5">
                    Color: {item.colorName} • Size: {item.size} • Qty: {item.quantity}
                  </div>
                  {item.isCustomized && item.customization && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-lime/10 border border-brand-lime/30 rounded text-brand-lime text-[11px] font-mono">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        Custom Studio Artwork: {item.customization.designTitle} ({item.customization.elementCount} layers)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right sm:self-center font-mono font-bold text-white text-sm">
                {formatINR(item.totalPaise)}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="border-t border-canvas-border pt-4 space-y-1.5 text-xs text-brand-gray">
          <div className="flex justify-between">
            <span>Garments Subtotal</span>
            <span className="font-mono text-white">{formatINR(order.subtotalPaise)}</span>
          </div>
          {order.customizationTotalPaise > 0 && (
            <div className="flex justify-between">
              <span>Custom Studio Fees</span>
              <span className="font-mono text-brand-lime">+{formatINR(order.customizationTotalPaise)}</span>
            </div>
          )}
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-brand-lime">
              <span>Promo Discount</span>
              <span className="font-mono">-{formatINR(order.discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-mono text-white">
              {order.shippingPaise === 0 ? 'FREE' : formatINR(order.shippingPaise)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>GST (5%)</span>
            <span className="font-mono text-white">{formatINR(order.taxPaise)}</span>
          </div>
          <div className="border-t border-canvas-border pt-2 flex justify-between items-baseline font-bold text-sm text-white">
            <span>Total Paid</span>
            <span className="text-lg text-brand-lime font-mono">{formatINR(order.totalPayablePaise)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Address & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-canvas-card border border-canvas-border rounded-xl p-5 text-xs space-y-2">
          <div className="font-mono font-bold uppercase text-brand-gray flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-brand-lime" />
            Delivery Destination
          </div>
          <div className="font-bold text-white text-sm">{order.shippingAddress.fullName}</div>
          <div className="text-brand-gray">{order.shippingAddress.addressLine}</div>
          <div className="text-brand-gray">
            {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pinCode}
          </div>
          <div className="text-brand-gray font-mono">Mobile: {order.shippingAddress.phone}</div>
        </div>

        <div className="bg-canvas-card border border-canvas-border rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="text-xs font-mono font-bold uppercase text-brand-gray mb-1">
              Need Assistance?
            </div>
            <p className="text-xs text-brand-gray">
              Questions regarding print proofing or shipping adjustments? Our Indiranagar micro-factory team is on standby.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/track-order?ref=${order.orderNumber}`}
              className="flex-1 py-2.5 px-4 bg-brand-lime text-black font-bold text-xs uppercase tracking-wider rounded-lg text-center shadow-glow"
            >
              Track Order Live
            </Link>
            <Link
              href="/shop"
              className="py-2.5 px-4 bg-canvas-dark border border-canvas-border text-white text-xs font-semibold rounded-lg hover:border-white transition-colors"
            >
              Shop More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
