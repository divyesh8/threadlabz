import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/config';
import { Sparkles, Zap, ShieldCheck, Factory, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="space-y-4 text-center">
        <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
          About THREADLAB
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Your Style. Your Canvas.
        </h1>
        <p className="text-sm sm:text-base text-brand-gray max-w-2xl mx-auto leading-relaxed">
          THREADLAB was founded in Bengaluru with a singular vision: bridge the gap between architectural streetwear silhouettes and effortless personalization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-canvas-card border border-canvas-border rounded-2xl p-6 space-y-3 shadow-subtle">
          <Factory className="w-8 h-8 text-brand-lime mb-1" />
          <h3 className="text-base font-bold text-white uppercase font-mono">
            Digital Micro-Factory
          </h3>
          <p className="text-xs text-brand-gray leading-relaxed">
            Unlike legacy mass-manufacturing factories that demand thousands of units, our digital micro-factory in Indiranagar, Bengaluru uses cutting-edge Direct-to-Garment (DTG) industrial printers with zero minimum order quantities.
          </p>
        </div>

        <div className="bg-canvas-card border border-canvas-border rounded-2xl p-6 space-y-3 shadow-subtle">
          <Zap className="w-8 h-8 text-brand-lime mb-1" />
          <h3 className="text-base font-bold text-white uppercase font-mono">
            Archival Fabric Weights
          </h3>
          <p className="text-xs text-brand-gray leading-relaxed">
            We don't print on flimsy promotional tees. Every silhouette starts at 240 GSM double-combed cotton and climbs to 400 GSM brushed fleece hoodies for authentic structured drapes.
          </p>
        </div>
      </div>

      <div className="p-8 bg-canvas-card border border-canvas-border rounded-2xl text-center space-y-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Ready to Wear Your Own Creation?
        </h2>
        <p className="text-xs text-brand-gray max-w-md mx-auto">
          Launch our 2D Custom Studio, experiment with streetwear typography and vector motifs, and order your custom garment.
        </p>
        <Link
          href="/design-studio"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-lime text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow"
        >
          <Sparkles className="w-4 h-4" />
          Launch Studio Canvas
        </Link>
      </div>
    </div>
  );
}
