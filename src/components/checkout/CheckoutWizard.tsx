'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ShippingAddress, Order, OrderItem } from '@/types/order';
import { formatINR } from '@/lib/currency';
import { generateId } from '@/lib/utils';
import { StoreRepository } from '@/lib/db/store';
import {
  Check,
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  QrCode,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Karnataka',
  'Maharashtra',
  'Delhi NCR',
  'Tamil Nadu',
  'Telangana',
  'Kerala',
  'West Bengal',
  'Gujarat',
  'Rajasthan',
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'Goa',
];

export function CheckoutWizard() {
  const router = useRouter();
  const { items, pricing, clearCart, shippingMethod, setShippingMethod } = useCart();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Address State
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: user?.fullName || 'Arjun Sharma',
    phone: user?.phone || '+91 98765 43210',
    email: user?.email || 'arjun.sharma@example.com',
    addressLine: user?.address?.addressLine || 'Flat 402, Skyline Residency, 12th Main Road, Indiranagar',
    landmark: 'Opposite Metro Pillar 114',
    city: user?.address?.city || 'Bengaluru',
    state: user?.address?.state || 'Karnataka',
    pinCode: user?.address?.pinCode || '560038',
    country: 'India',
  });

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'card' | 'cod'>('razorpay');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Your Shopping Bag is Empty</h2>
        <p className="text-xs text-brand-gray mb-6">Add garments or custom prints before proceeding to checkout.</p>
        <button
          type="button"
          onClick={() => router.push('/shop')}
          className="px-6 py-3 bg-brand-lime text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-glow"
        >
          Explore Collection
        </button>
      </div>
    );
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.fullName || !address.phone || !address.addressLine || !address.pinCode) {
      alert('Please fill out all required delivery fields.');
      return;
    }
    setCurrentStep(2);
  };

  const handlePlaceOrder = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    // Simulate secure Razorpay gateway handshake
    setTimeout(() => {
      try {
        const orderId = generateId('ord');
        const orderNumber = `TL-${Math.floor(100000 + Math.random() * 900000)}`;

        const orderItems: OrderItem[] = items.map((item) => ({
          id: generateId('item'),
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          variantId: item.variantId,
          size: item.size,
          colorName: item.colorName,
          colorHex: item.colorHex,
          garmentImage: item.garmentImage,
          quantity: item.quantity,
          unitPricePaise: item.unitPricePaise,
          customizationFeePaise: item.customizationFeePaise,
          totalPaise: (item.unitPricePaise + item.customizationFeePaise) * item.quantity,
          isCustomized: item.isCustomized,
          customization: item.customization,
        }));

        const newOrder: Order = {
          id: orderId,
          orderNumber,
          customerId: user?.id,
          customerEmail: address.email,
          customerPhone: address.phone,
          shippingAddress: { ...address },
          items: orderItems,
          subtotalPaise: pricing.itemsSubtotalPaise,
          customizationTotalPaise: pricing.customizationTotalPaise,
          discountPaise: pricing.discountPaise,
          shippingPaise: pricing.shippingPaise,
          taxPaise: pricing.taxPaise,
          totalPayablePaise: pricing.totalPayablePaise,
          payment: {
            method: paymentMethod,
            status: paymentMethod === 'cod' ? 'pending' : 'captured',
            transactionId: `pay_rzp_mock_${Math.floor(100000 + Math.random() * 900000)}`,
            razorpayPaymentId: `rzp_live_${Math.floor(100000 + Math.random() * 900000)}`,
            paidAt: new Date().toISOString(),
            isDemoSandbox: true,
          },
          status: 'confirmed',
          timeline: [
            {
              status: 'confirmed',
              title: 'Order Confirmed',
              description: paymentMethod === 'cod' ? 'Order accepted (Cash on Delivery)' : 'Payment captured securely via Razorpay Sandbox',
              timestamp: new Date().toISOString(),
              completed: true,
            },
            {
              status: 'design_verification',
              title: 'Design Verification',
              description: 'Artwork resolution & print placement inspection scheduled',
              timestamp: new Date(Date.now() + 3600000).toISOString(),
              completed: false,
            },
            {
              status: 'in_production',
              title: 'Micro-Factory Production',
              description: 'Direct-to-Garment printing, steaming & heat cure',
              timestamp: new Date(Date.now() + 86400000).toISOString(),
              completed: false,
            },
          ],
          estimatedDeliveryDate: new Date(Date.now() + 4 * 86400000).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        StoreRepository.createOrder(newOrder);
        clearCart();
        setIsProcessingPayment(false);
        router.push(`/order-confirmation/${orderNumber}`);
      } catch (err: any) {
        setIsProcessingPayment(false);
        setPaymentError('Payment failed or transaction declined. Please try again.');
      }
    }, 1800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Checkout Progress Stepper */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 text-xs font-mono">
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            currentStep === 1 ? 'bg-brand-lime text-black font-bold' : 'bg-canvas-card text-brand-gray border border-canvas-border'
          }`}
        >
          1. Delivery Address
        </span>
        <span className="text-canvas-border">→</span>
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            currentStep === 2 ? 'bg-brand-lime text-black font-bold' : 'bg-canvas-card text-brand-gray border border-canvas-border'
          }`}
        >
          2. Shipping Method
        </span>
        <span className="text-canvas-border">→</span>
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            currentStep === 3 ? 'bg-brand-lime text-black font-bold' : 'bg-canvas-card text-brand-gray border border-canvas-border'
          }`}
        >
          3. Payment Gateway
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: DELIVERY ADDRESS */}
          {currentStep === 1 && (
            <form onSubmit={handleAddressSubmit} className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  1. Indian Delivery Information
                </h3>
                <span className="text-[11px] text-brand-lime font-mono">Secure SSL Checkout</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={address.fullName}
                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">Mobile Number (for Courier SMS) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-brand-gray block mb-1">Email Address (Order Confirmation) *</label>
                <input
                  type="email"
                  required
                  value={address.email}
                  onChange={(e) => setAddress({ ...address, email: e.target.value })}
                  className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-brand-gray block mb-1">Flat / Building / Street Address *</label>
                <input
                  type="text"
                  required
                  value={address.addressLine}
                  onChange={(e) => setAddress({ ...address, addressLine: e.target.value })}
                  className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={address.pinCode}
                    onChange={(e) => setAddress({ ...address, pinCode: e.target.value })}
                    className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white font-mono focus:border-brand-lime outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">City / District *</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-brand-gray block mb-1">State *</label>
                  <select
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white focus:border-brand-lime outline-none"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-brand-lime hover:bg-brand-lime-hover text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-glow"
                >
                  Continue to Shipping
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: SHIPPING METHOD */}
          {currentStep === 2 && (
            <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  2. Select Shipping Method
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-brand-lime hover:underline font-mono"
                >
                  Edit Address
                </button>
              </div>

              <div className="space-y-3">
                <label
                  onClick={() => setShippingMethod('standard')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    shippingMethod === 'standard'
                      ? 'border-brand-lime bg-brand-lime/5'
                      : 'border-canvas-border bg-canvas-dark hover:border-canvas-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-brand-lime" />
                    <div>
                      <div className="text-xs font-bold text-white">Standard Delivery (3-5 Business Days)</div>
                      <div className="text-[11px] text-brand-gray">BlueDart / Delhivery Surface Logistics</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    {pricing.isFreeShipping ? 'FREE' : '₹99'}
                  </div>
                </label>

                <label
                  onClick={() => setShippingMethod('express')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    shippingMethod === 'express'
                      ? 'border-brand-lime bg-brand-lime/5'
                      : 'border-canvas-border bg-canvas-dark hover:border-canvas-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-brand-lime" />
                    <div>
                      <div className="text-xs font-bold text-white">Priority Air Express (1-2 Business Days)</div>
                      <div className="text-[11px] text-brand-gray">Fastest Micro-Factory Priority Slot</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">₹199</div>
                </label>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-mono text-brand-gray hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-brand-lime hover:bg-brand-lime-hover text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-glow"
                >
                  Proceed to Payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT INTEGRATION */}
          {currentStep === 3 && (
            <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-canvas-border">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  3. Payment Gateway Integration
                </h3>
                <span className="text-[11px] font-mono text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded border border-brand-lime/30">
                  Razorpay Sandbox Enabled
                </span>
              </div>

              <div className="space-y-3">
                {/* Razorpay Unified (Cards, UPI, Netbanking) */}
                <label
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'razorpay'
                      ? 'border-brand-lime bg-brand-lime/10 ring-1 ring-brand-lime'
                      : 'border-canvas-border bg-canvas-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-brand-lime" />
                    <div>
                      <div className="text-xs font-bold text-white">Razorpay (UPI / GooglePay / Cards / NetBanking)</div>
                      <div className="text-[11px] text-brand-gray">Instant verification with 256-bit AES encryption</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-brand-lime text-black px-2 py-0.5 rounded">
                    RECOMMENDED
                  </span>
                </label>

                {/* Instant UPI QR */}
                <label
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-brand-lime bg-brand-lime/10 ring-1 ring-brand-lime'
                      : 'border-canvas-border bg-canvas-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-brand-lime" />
                    <div>
                      <div className="text-xs font-bold text-white">Direct UPI QR / VPA</div>
                      <div className="text-[11px] text-brand-gray">Scan & Pay via BHIM, PhonePe, Paytm</div>
                    </div>
                  </div>
                </label>

                {/* Cash on Delivery */}
                <label
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-brand-lime bg-brand-lime/10 ring-1 ring-brand-lime'
                      : 'border-canvas-border bg-canvas-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-brand-lime" />
                    <div>
                      <div className="text-xs font-bold text-white">Cash on Delivery (COD)</div>
                      <div className="text-[11px] text-brand-gray">Pay upon delivery at your doorstep</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Security Banner */}
              <div className="p-3 bg-canvas-dark rounded-lg border border-canvas-border text-[11px] text-brand-gray flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-lime shrink-0" />
                <span>
                  Development Demo Mode: Payments are simulated safely. No real card will be charged.
                </span>
              </div>

              {paymentError && (
                <div className="p-3 bg-brand-accent/20 border border-brand-accent rounded-lg text-xs text-brand-accent flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-mono text-brand-gray hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handlePlaceOrder}
                  className="px-8 py-3.5 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Verifying with Razorpay...
                    </>
                  ) : (
                    <>
                      Pay {formatINR(pricing.totalPayablePaise)} & Place Order
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Order Review Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-canvas-card border border-canvas-border rounded-xl p-5 space-y-4 shadow-subtle">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-canvas-border pb-2">
              Order Summary ({items.length} items)
            </h3>

            {/* Items list */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs">
                  <img
                    src={item.garmentImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=100'}
                    alt={item.productName}
                    className="w-14 h-16 object-cover rounded bg-canvas-dark border border-canvas-border shrink-0"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-white truncate">{item.productName}</div>
                    <div className="text-[11px] text-brand-gray font-mono">
                      {item.colorName} • Size {item.size} • Qty {item.quantity}
                    </div>
                    {item.isCustomized && (
                      <div className="text-[10px] text-brand-lime font-mono">
                        ✓ Custom Studio Print ({item.customization?.designTitle})
                      </div>
                    )}
                  </div>
                  <div className="font-mono font-bold text-white text-right shrink-0">
                    {formatINR((item.unitPricePaise + item.customizationFeePaise) * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-canvas-border pt-3 space-y-1.5 text-xs text-brand-gray">
              <div className="flex justify-between">
                <span>Garments Subtotal</span>
                <span className="font-mono text-white">{formatINR(pricing.itemsSubtotalPaise)}</span>
              </div>
              {pricing.customizationTotalPaise > 0 && (
                <div className="flex justify-between">
                  <span>Custom Studio Fees</span>
                  <span className="font-mono text-brand-lime">+{formatINR(pricing.customizationTotalPaise)}</span>
                </div>
              )}
              {pricing.discountPaise > 0 && (
                <div className="flex justify-between text-brand-lime">
                  <span>Discount ({pricing.appliedPromo?.code})</span>
                  <span className="font-mono">-{formatINR(pricing.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping ({shippingMethod})</span>
                <span className="font-mono text-white">
                  {pricing.isFreeShipping ? 'FREE' : formatINR(pricing.shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-mono text-white">{formatINR(pricing.taxPaise)}</span>
              </div>
              <div className="border-t border-canvas-border pt-2 flex justify-between items-baseline font-bold text-sm text-white">
                <span>Total Payable</span>
                <span className="text-lg text-brand-lime font-mono">
                  {formatINR(pricing.totalPayablePaise)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
