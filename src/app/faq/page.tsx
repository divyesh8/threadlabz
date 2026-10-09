import React from 'react';

export default function FaqPage() {
  const faqs = [
    {
      q: 'How does the 2D Custom Design Studio work?',
      a: 'Select any customizable garment (T-Shirt, Oversized Fit, or 400 GSM Hoodie). You can add custom text, choose from our curated streetwear fonts, position vector graphic stickers, or upload your own 300 DPI high-resolution artwork. You can design both the front and back view.',
    },
    {
      q: 'What is Direct-to-Garment (DTG) printing?',
      a: 'DTG uses advanced industrial water-based inkjet technology that prints directly into the combed cotton fibers rather than sitting as a rubbery sticker on top. The result is breathable, vibrant, and soft to the touch, with outstanding wash resistance.',
    },
    {
      q: 'What file formats can I upload in the design studio?',
      a: 'We accept PNG, JPEG, WebP, and SVG files up to 10MB. For best results on black garments, upload PNG files with a transparent background at 1500 × 1500 px or higher.',
    },
    {
      q: 'How long does custom production take before shipping?',
      a: 'Ready-made blanks dispatch within 24 hours. Custom studio print pieces undergo proof verification, DTG printing, and heat-press curing at our Bengaluru micro-factory within 24-48 hours before courier handover.',
    },
    {
      q: 'What are the delivery charges and delivery times across India?',
      a: 'We offer Free Standard Delivery on all orders above ₹999. For orders below ₹999, a flat delivery fee of ₹99 applies. Standard delivery takes 3-5 business days. We also offer Priority Air Express for ₹199 (1-2 business days).',
    },
    {
      q: 'Can I return or exchange a customized garment?',
      a: 'Ready-made blank garments can be returned within 14 days. Custom printed items are manufactured specifically for your unique order and cannot be returned unless there is a physical manufacturing defect or print flaw.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
          Knowledge Base
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs text-brand-gray">
          Everything you need to know about fabric specifications, custom studio printing, and delivery.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, idx) => (
          <div
            key={idx}
            className="p-6 bg-canvas-card border border-canvas-border rounded-xl space-y-2 shadow-subtle"
          >
            <h3 className="text-sm font-bold text-white font-mono">{f.q}</h3>
            <p className="text-xs text-brand-gray leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
