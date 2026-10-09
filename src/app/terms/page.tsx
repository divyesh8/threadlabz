import React from 'react';
import { STORE_CONFIG } from '@/lib/config';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-brand-gray leading-relaxed">
      <h1 className="text-3xl font-black text-white tracking-tight font-mono">
        Terms of Service
      </h1>
      <p className="text-[11px] font-mono text-brand-lime">
        Effective Date: 2026-04-01 • {STORE_CONFIG.legalName}
      </p>

      <div className="space-y-4 pt-4 border-t border-canvas-border">
        <h2 className="text-sm font-bold text-white font-mono uppercase">1. Custom Artwork Content Guidelines</h2>
        <p>
          By uploading graphics or text to the THREADLAB customizer, you confirm that you hold the necessary rights or licenses to reproduce the content. We reserve the right to cancel orders that contain hate speech, unlawful harassment, or blatant trademark infringement.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">2. Pricing & Currency</h2>
        <p>
          All prices on the THREADLAB storefront are in Indian Rupees (INR ₹) and are inclusive of standard 5% garment GST. Customization charges (e.g. ₹200 per print area) are itemized transparently in your shopping bag before checkout.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">3. Governing Jurisdiction</h2>
        <p>
          These terms and agreements are governed by the laws of India, under the jurisdiction of the courts of Bengaluru, Karnataka.
        </p>
      </div>
    </div>
  );
}
