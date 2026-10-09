import React from 'react';

export default function ReturnsPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-xs text-brand-gray leading-relaxed">
      <h1 className="text-3xl font-black text-white tracking-tight font-mono">
        Returns & Exchanges Policy
      </h1>
      <p className="text-[11px] font-mono text-brand-lime">
        Effective Date: 2026-04-01 • Customer Satisfaction Assurance
      </p>

      <div className="space-y-4 pt-4 border-t border-canvas-border">
        <h2 className="text-sm font-bold text-white font-mono uppercase">1. Ready-Made Blank Garments</h2>
        <p>
          We offer a 14-day hassle-free return and exchange policy on all standard non-customized clothing. Items must be unworn, unwashed, and returned in their original packaging with tags intact.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">2. Personalized & Custom Studio Items</h2>
        <p>
          Customized pieces personalized with your custom typography, stickers, or uploaded images are manufactured exclusively on demand for your specific order. Therefore, custom garments cannot be returned or exchanged for change of mind or incorrect size choice. Please consult our Size Matrix before submitting your design.
        </p>

        <h2 className="text-sm font-bold text-white font-mono uppercase">3. Defective Prints & Replacements</h2>
        <p>
          If your custom garment arrives damaged, defective, or with a significant printing flaw, email our Indiranagar care team at <strong className="text-white">care@threadlab.in</strong> with photos within 48 hours of delivery. We will issue a free expedited reprint or full refund immediately.
        </p>
      </div>
    </div>
  );
}
