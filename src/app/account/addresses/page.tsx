'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, MapPin, Plus, Check } from 'lucide-react';

export default function AccountAddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([
    {
      id: 'addr_1',
      fullName: user?.fullName || 'Arjun Sharma',
      phone: user?.phone || '+91 98765 43210',
      addressLine: 'Flat 402, Skyline Residency, 12th Main Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560038',
      isDefault: true,
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newAddr, setNewAddr] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    city: '',
    state: 'Karnataka',
    pinCode: '',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddresses([
      ...addresses,
      {
        id: `addr_${Date.now()}`,
        ...newAddr,
        isDefault: false,
      },
    ]);
    setIsAdding(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-gray hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Account
        </Link>
        <h1 className="text-3xl font-black text-white tracking-tight">Delivery Addresses</h1>
        <p className="text-xs text-brand-gray mt-1">
          Saved Indian delivery destinations for expedited checkout
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="p-5 bg-canvas-card border border-canvas-border rounded-xl space-y-3 relative shadow-subtle"
          >
            {addr.isDefault && (
              <span className="text-[10px] font-mono text-brand-lime font-bold uppercase bg-brand-lime/10 px-2 py-0.5 rounded border border-brand-lime/30 inline-block">
                Default Address
              </span>
            )}
            <div className="font-bold text-white text-sm">{addr.fullName}</div>
            <div className="text-xs text-brand-gray leading-relaxed">
              {addr.addressLine}
              <br />
              {addr.city}, {addr.state} — {addr.pinCode}
            </div>
            <div className="text-xs font-mono text-brand-gray pt-1">
              Mobile: {addr.phone}
            </div>
          </div>
        ))}

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="p-8 border-2 border-dashed border-canvas-border hover:border-brand-lime rounded-xl flex flex-col items-center justify-center gap-2 text-brand-gray hover:text-white transition-all bg-canvas-dark"
          >
            <Plus className="w-6 h-6 text-brand-lime" />
            <span className="text-xs font-bold font-mono uppercase">Add New Address</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4 max-w-lg">
          <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-canvas-border pb-2">
            New Delivery Address
          </h3>
          <div>
            <label className="text-[11px] font-mono text-brand-gray block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newAddr.fullName}
              onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
              className="w-full bg-canvas-dark border border-canvas-border rounded p-2 text-xs text-white focus:border-brand-lime outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono text-brand-gray block mb-1">Mobile Number</label>
            <input
              type="tel"
              required
              value={newAddr.phone}
              onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
              className="w-full bg-canvas-dark border border-canvas-border rounded p-2 text-xs text-white focus:border-brand-lime outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono text-brand-gray block mb-1">Street Address</label>
            <input
              type="text"
              required
              value={newAddr.addressLine}
              onChange={(e) => setNewAddr({ ...newAddr, addressLine: e.target.value })}
              className="w-full bg-canvas-dark border border-canvas-border rounded p-2 text-xs text-white focus:border-brand-lime outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono text-brand-gray block mb-1">City</label>
              <input
                type="text"
                required
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                className="w-full bg-canvas-dark border border-canvas-border rounded p-2 text-xs text-white focus:border-brand-lime outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono text-brand-gray block mb-1">PIN Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={newAddr.pinCode}
                onChange={(e) => setNewAddr({ ...newAddr, pinCode: e.target.value })}
                className="w-full bg-canvas-dark border border-canvas-border rounded p-2 text-xs text-white focus:border-brand-lime outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-brand-lime text-black font-bold text-xs rounded shadow-glow"
            >
              Save Address
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-canvas-dark text-brand-gray hover:text-white text-xs rounded border border-canvas-border"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
