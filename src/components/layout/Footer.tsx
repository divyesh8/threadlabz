'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/config';
import { ArrowRight, Check, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@')) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-canvas-dark border-t border-canvas-border text-brand-gray text-xs">
      {/* Top Banner: Brand Manifesto & Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-canvas-border grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-2">
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            THREAD<span className="text-brand-lime">LAB</span> STUDIOS
          </div>
          <p className="text-sm text-brand-gray max-w-lg leading-relaxed">
            {STORE_CONFIG.tagline} We believe clothing should be personal. Explore our heavy-drape silhouettes or print your original artwork through our digital micro-factory in Bengaluru.
          </p>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-canvas-card border border-canvas-border p-4 rounded-xl">
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-1">
              Join the Lab Syndicate
            </div>
            <div className="text-[11px] text-brand-gray mb-3">
              Receive drop notices, secret template packs, and 15% off your first custom piece.
            </div>

            {subscribed ? (
              <div className="flex items-center gap-2 text-brand-lime text-xs font-mono py-2">
                <Check className="w-4 h-4" />
                <span>You are on the drop list! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-canvas-dark border border-canvas-border rounded-lg px-3 py-2 text-xs text-white focus:border-brand-lime outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-lime hover:bg-brand-lime-hover text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 shadow-glow"
                >
                  Join
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Link Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {/* Categories */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Collections
          </div>
          <ul className="space-y-2">
            <li><Link href="/shop/t-shirts" className="hover:text-white transition-colors">Classic T-Shirts</Link></li>
            <li><Link href="/shop/oversized" className="hover:text-white transition-colors">Oversized Drop Fits</Link></li>
            <li><Link href="/shop/hoodies" className="hover:text-white transition-colors">400 GSM Heavy Hoodies</Link></li>
            <li><Link href="/shop/sweatshirts" className="hover:text-white transition-colors">Fleece Sweatshirts</Link></li>
            <li><Link href="/shop/polo" className="hover:text-white transition-colors">Supima Cotton Polos</Link></li>
            <li><Link href="/shop/shirts" className="hover:text-white transition-colors">Resort & Cuban Shirts</Link></li>
            <li><Link href="/shop/bottoms" className="hover:text-white transition-colors">Denim & Chinos</Link></li>
          </ul>
        </div>

        {/* Custom Studio */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Design Studio
          </div>
          <ul className="space-y-2">
            <li><Link href="/design-studio" className="text-brand-lime font-medium hover:underline">Launch Studio Canvas</Link></li>
            <li><Link href="/design-studio" className="hover:text-white transition-colors">Streetwear Templates</Link></li>
            <li><Link href="/design-studio" className="hover:text-white transition-colors">Front & Back Print Specs</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">DTG Print Quality</Link></li>
            <li><Link href="/account/designs" className="hover:text-white transition-colors">My Saved Designs</Link></li>
          </ul>
        </div>

        {/* Customer Care */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Support
          </div>
          <ul className="space-y-2">
            <li><Link href="/track-order" className="hover:text-white transition-colors">Track Your Order</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-colors">Size Guide & Fit Matrix</Link></li>
            <li><Link href="/shipping-policy" className="hover:text-white transition-colors">Shipping & Delivery Policy</Link></li>
            <li><Link href="/returns-policy" className="hover:text-white transition-colors">Returns & Exchanges</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Help & Contact</Link></li>
          </ul>
        </div>

        {/* Legal & Policies */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Information
          </div>
          <ul className="space-y-2">
            <li><Link href="/about" className="hover:text-white transition-colors">About THREADLAB</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link href="/admin" className="hover:text-brand-lime transition-colors">Admin Portal</Link></li>
          </ul>
        </div>

        {/* Studio Location & Contact */}
        <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Studio HQ
          </div>
          <div className="space-y-2 text-[11px] leading-relaxed">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-brand-lime shrink-0 mt-0.5" />
              <span>Indiranagar 100ft Road, Bengaluru, Karnataka 560038</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-brand-lime shrink-0" />
              <span>{STORE_CONFIG.support.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-brand-lime shrink-0" />
              <span>{STORE_CONFIG.support.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & GSTIN */}
      <div className="border-t border-canvas-border bg-canvas-card/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-brand-gray font-mono">
          <div>
            © {new Date().getFullYear()} {STORE_CONFIG.legalName}. All rights reserved. GST Registered.
          </div>
          <div className="flex items-center gap-4">
            <span>Prices displayed in Indian Rupees (INR ₹)</span>
            <span>•</span>
            <span className="text-white">Crafted in Bengaluru, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
