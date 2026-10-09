'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingBag,
  Heart,
  Search,
  User,
  Sparkles,
  Menu,
  X,
  Shield,
  Layers,
} from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { totalItemCount, setIsCartOpen } = useCart();
  const { user, isAdmin, wishlist, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { label: 'Shop All', href: '/shop' },
    { label: 'T-Shirts', href: '/shop/t-shirts' },
    { label: 'Hoodies', href: '/shop/hoodies' },
    { label: 'Oversized', href: '/shop/oversized' },
    {
      label: 'Design Studio',
      href: '/design-studio',
      highlight: true,
    },
    { label: 'Track Order', href: '/track-order' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-canvas-border bg-canvas-dark/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Mobile Menu Trigger & Logo */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-brand-gray hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-1.5 group">
            <span className="font-extrabold tracking-tighter text-xl sm:text-2xl text-white font-mono">
              THREAD<span className="text-brand-lime">LAB</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse inline-block" />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-mono">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'border-brand-lime bg-brand-lime text-black font-bold shadow-glow'
                      : 'border-brand-lime/50 text-brand-lime hover:border-brand-lime hover:bg-brand-lime/10'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1 hover:text-white ${
                  isActive ? 'text-brand-lime font-bold border-b border-brand-lime' : 'text-brand-gray'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Search, Wishlist, Account, Cart */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search Trigger */}
          <Link
            href="/search"
            className="p-2 text-brand-gray hover:text-white transition-colors"
            title="Search Products"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>

          {/* Wishlist */}
          <Link
            href="/wishlist"
            className="relative p-2 text-brand-gray hover:text-white transition-colors"
            title="Wishlist"
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>

          {/* User Account / Role switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="p-2 text-brand-gray hover:text-white flex items-center gap-1 transition-colors"
              title="Customer Account"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              {isAdmin && (
                <span className="hidden xl:inline text-[10px] bg-brand-lime text-black px-1.5 py-0.5 rounded font-mono font-bold">
                  ADMIN
                </span>
              )}
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-canvas-card border border-canvas-border rounded-xl shadow-2xl p-2 z-50 text-xs font-mono"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-canvas-border mb-1">
                  <div className="text-white font-bold truncate">
                    {user ? user.fullName : 'Guest Explorer'}
                  </div>
                  <div className="text-[10px] text-brand-gray truncate">
                    {user ? user.email : 'Browsing Demo Store'}
                  </div>
                </div>

                <Link
                  href="/account"
                  className="block px-3 py-2 text-brand-gray hover:text-white hover:bg-canvas-subtle rounded-lg"
                >
                  My Account
                </Link>
                <Link
                  href="/account/orders"
                  className="block px-3 py-2 text-brand-gray hover:text-white hover:bg-canvas-subtle rounded-lg"
                >
                  Order History
                </Link>
                <Link
                  href="/account/designs"
                  className="block px-3 py-2 text-brand-gray hover:text-white hover:bg-canvas-subtle rounded-lg"
                >
                  Saved Custom Designs
                </Link>

                {/* Admin Quick Link */}
                <div className="border-t border-canvas-border my-1 pt-1">
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-2 text-brand-lime hover:bg-brand-lime/10 rounded-lg font-bold"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Operations Portal
                  </Link>
                </div>

                {/* Role Switcher for instant testing */}
                <div className="border-t border-canvas-border mt-1 pt-1.5 px-3 py-1 text-[10px] text-brand-gray">
                  <div>Switch Demo Role:</div>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => switchRole('customer')}
                      className="px-2 py-1 bg-canvas-dark rounded hover:text-white border border-canvas-border"
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => switchRole('admin')}
                      className="px-2 py-1 bg-canvas-dark rounded hover:text-brand-lime border border-canvas-border"
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart Bag with Trigger */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 bg-canvas-subtle hover:bg-canvas-border rounded-xl text-white transition-all flex items-center justify-center shadow-sm"
            title="Open Bag"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-brand-lime" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-lime text-black text-[10px] font-extrabold rounded-full flex items-center justify-center font-mono shadow-glow">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-canvas-border bg-canvas-card px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2.5 px-3 rounded-lg text-xs font-mono uppercase tracking-wider ${
                link.highlight
                  ? 'bg-brand-lime text-black font-bold'
                  : pathname === link.href
                  ? 'bg-canvas-dark text-white'
                  : 'text-brand-gray hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-canvas-border pt-3">
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 px-3 text-brand-lime text-xs font-mono font-bold"
            >
              <Shield className="w-4 h-4" />
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
