'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Sparkles,
  Sliders,
  ExternalLink,
  Lock,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin, switchRole } = useAuth();

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-brand-accent/10 text-brand-accent border border-brand-accent/30 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Admin Access Restricted</h1>
        <p className="text-xs text-brand-gray leading-relaxed">
          This portal is reserved for THREADLAB micro-factory managers and staff. To test and explore administrative features in this development environment, unlock admin role below:
        </p>
        <button
          type="button"
          onClick={() => switchRole('admin')}
          className="px-6 py-3 bg-brand-lime text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow"
        >
          Unlock Admin Access (Demo Mode)
        </button>
      </div>
    );
  }

  const adminLinks = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Orders & Fulfilment', href: '/admin/orders', icon: ShoppingBag },
    { label: 'Products & Stock', href: '/admin/products', icon: Package },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-canvas-card border border-canvas-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-lime text-black rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              THREADLAB Operations & Micro-Factory Portal
              <span className="text-[10px] font-mono bg-brand-lime/10 text-brand-lime border border-brand-lime/30 px-2 py-0.5 rounded">
                Live Admin Mode
              </span>
            </div>
            <div className="text-[11px] text-brand-gray">
              Direct-to-Garment Micro-Factory • Indiranagar, Bengaluru
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-mono text-brand-gray hover:text-white flex items-center gap-1"
          >
            Storefront <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => switchRole('customer')}
            className="text-xs font-mono text-brand-accent hover:underline"
          >
            Exit Admin Mode
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-canvas-border gap-2 font-mono text-xs uppercase tracking-wider">
        {adminLinks.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
                isActive
                  ? 'border-brand-lime text-brand-lime font-bold bg-brand-lime/5'
                  : 'border-transparent text-brand-gray hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}
