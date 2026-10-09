'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { StoreRepository } from '@/lib/db/store';
import { formatINR } from '@/lib/currency';
import {
  User,
  Package,
  Bookmark,
  Heart,
  MapPin,
  Shield,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function AccountPage() {
  const { user, isAdmin, logout, switchRole } = useAuth();
  const allOrders = StoreRepository.getAllOrders();
  const userOrders = user
    ? allOrders.filter((o) => o.customerEmail === user.email || o.customerId === user.id)
    : allOrders.slice(0, 2);

  const savedDesigns = StoreRepository.getSavedDesigns();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Account Header */}
      <div className="bg-canvas-card border border-canvas-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-subtle">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-lime text-black font-extrabold flex items-center justify-center text-xl font-mono shadow-glow">
            {user ? user.fullName.charAt(0).toUpperCase() : 'G'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {user ? user.fullName : 'Guest Explorer'}
              </h1>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-lime text-black">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-brand-gray font-mono mt-0.5">
              {user ? user.email : 'Explore without signing in'} • Member since 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="px-4 py-2 bg-brand-lime/10 border border-brand-lime/40 text-brand-lime text-xs font-mono font-bold rounded-lg hover:bg-brand-lime/20 transition-colors"
            >
              Operations Portal
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 bg-canvas-dark border border-canvas-border text-brand-gray hover:text-white text-xs font-mono rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Nav Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/account/orders"
          className="p-5 bg-canvas-card border border-canvas-border hover:border-brand-lime/60 rounded-xl transition-all group shadow-subtle"
        >
          <Package className="w-6 h-6 text-brand-lime mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-bold text-white">Order History</div>
          <div className="text-xs text-brand-gray mt-1">{userOrders.length} orders recorded</div>
        </Link>

        <Link
          href="/account/designs"
          className="p-5 bg-canvas-card border border-canvas-border hover:border-brand-lime/60 rounded-xl transition-all group shadow-subtle"
        >
          <Sparkles className="w-6 h-6 text-brand-lime mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-bold text-white">Saved Custom Designs</div>
          <div className="text-xs text-brand-gray mt-1">{savedDesigns.length} studio artworks</div>
        </Link>

        <Link
          href="/wishlist"
          className="p-5 bg-canvas-card border border-canvas-border hover:border-brand-lime/60 rounded-xl transition-all group shadow-subtle"
        >
          <Heart className="w-6 h-6 text-brand-lime mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-bold text-white">Wishlist</div>
          <div className="text-xs text-brand-gray mt-1">Saved silhouettes</div>
        </Link>

        <Link
          href="/account/addresses"
          className="p-5 bg-canvas-card border border-canvas-border hover:border-brand-lime/60 rounded-xl transition-all group shadow-subtle"
        >
          <MapPin className="w-6 h-6 text-brand-lime mb-2 group-hover:scale-110 transition-transform" />
          <div className="text-sm font-bold text-white">Delivery Addresses</div>
          <div className="text-xs text-brand-gray mt-1">Manage delivery locations</div>
        </Link>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-canvas-card border border-canvas-border rounded-xl p-6 space-y-4 shadow-subtle">
        <div className="flex items-center justify-between border-b border-canvas-border pb-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Recent Orders
          </h2>
          <Link
            href="/account/orders"
            className="text-xs font-mono text-brand-lime hover:underline flex items-center gap-1"
          >
            View all orders <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {userOrders.length === 0 ? (
          <div className="text-center py-8 text-xs text-brand-gray">
            You haven't placed an order yet.{' '}
            <Link href="/shop" className="text-brand-lime hover:underline">
              Start shopping!
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {userOrders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                className="p-4 bg-canvas-dark border border-canvas-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-brand-lime text-black px-2 py-0.5 rounded font-bold">
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-brand-gray mt-1">
                    {order.items.length} garments • {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono text-xs font-bold text-white">
                    {formatINR(order.totalPayablePaise)}
                  </div>
                  <Link
                    href={`/order-confirmation/${order.orderNumber}`}
                    className="p-2 bg-canvas-subtle hover:bg-canvas-card border border-canvas-border text-white rounded text-xs transition-colors flex items-center gap-1"
                  >
                    Details <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
