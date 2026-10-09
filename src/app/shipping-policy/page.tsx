import React from 'react';
import { STORE_CONFIG } from '@/lib/config';

export default function ShippingPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-brand-gray leading-relaxed">
      <h1 className="text-3xl font-black text-white tracking-tight font-mono">
        Shipping & Delivery Policy
      </h1>
      <p className="text-[11px] font-mono text-brand-lime">
        Effective Date: 2026-04-01 • Dispatch from Indiranagar, Bengaluru
      </p>

      <div className="space-y-4 pt-4 border-t border-canvas-border">
        <h2 className="text-sm font-bold text-white font-mono uppercase">1. Delivery Zones & Timeline</h2>
        <p>
          THREADLAB delivers across all PIN codes in India. Orders are dispatched via BlueDart Express, Delhivery, or Xpressbees. Standard delivery transit time is 3-5 business days across metro cities and 5-7 business days for regional areas.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">2. Shipping Charges</h2>
        <p>
          • <strong>Free Shipping:</strong> Automatically applied to all orders with a cart merchandise total of ₹999 or higher.<br />
          • <strong>Standard Shipping:</strong> A flat ₹99 fee applies on orders below ₹999.<br />
          • <strong>Priority Air Express:</strong> ₹199 for expedited dispatch and air courier routing.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">3. Production for Custom Studio Apparel</h2>
        <p>
          Customized pieces created in our 2D studio require 24-48 hours of micro-factory production (pretreating, 300 DPI Direct-to-Garment printing, and tunnel dryer heat curing) before dispatch.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">4. Tracking Your Order</h2>
        <p>
          As soon as your shipment is dispatched, an SMS and email notification with your Air Waybill (AWB) number and direct tracking link is dispatched. You can track live order milestones anytime at our <a href="/track-order" className="text-brand-lime hover:underline">Track Order</a> portal.
        </p>
      </div>
    </div>
  );
}
