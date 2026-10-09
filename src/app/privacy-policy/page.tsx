import React from 'react';
import { STORE_CONFIG } from '@/lib/config';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-brand-gray leading-relaxed">
      <h1 className="text-3xl font-black text-white tracking-tight font-mono">
        Privacy & Data Security Policy
      </h1>
      <p className="text-[11px] font-mono text-brand-lime">
        Effective Date: 2026-04-01 • {STORE_CONFIG.legalName}
      </p>

      <div className="space-y-4 pt-4 border-t border-canvas-border">
        <h2 className="text-sm font-bold text-white font-mono uppercase">1. Information We Collect</h2>
        <p>
          We collect your name, contact phone, delivery address, and email solely to process your orders, render your custom studio artwork proofs, and send courier tracking milestones.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">2. User Artwork & Intellectual Property</h2>
        <p>
          Original designs, images, and artwork uploaded by customers to the THREADLAB 2D Studio remain the exclusive intellectual property of the customer. We will never sell, license, or repurpose your custom artwork for third-party commercial reproduction.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">3. Payment Information Security</h2>
        <p>
          Payment transactions are processed through Razorpay using PCI-DSS Level 1 compliant secure tokens. THREADLAB never receives, stores, or processes raw credit/debit card numbers or UPI MPINs on its servers.
        </p>
      </div>
    </div>
  );
}
