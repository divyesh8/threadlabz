import React from 'react';
import Link from 'next/link';
import { StoreRepository } from '@/lib/db/store';
import { ProductCard } from '@/components/product/ProductCard';
import WorksWheelDemo from '@/components/ui/demo';
import { STORE_CONFIG } from '@/lib/config';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Compass,
  Palette,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const allProducts = StoreRepository.getAllProducts();
  const trendingProducts = allProducts.filter((p) => p.isTrending || p.isFeatured).slice(0, 6);
  const customizableProducts = allProducts.filter((p) => p.isCustomizable).slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-canvas-border bg-gradient-to-b from-canvas-dark via-canvas-card to-canvas-dark">
        {/* Background Subtle Gradient & Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-lime/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/30 text-brand-lime text-xs font-mono font-bold tracking-wider uppercase mb-6 shadow-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Drop 04 // Interactive Custom Clothing Studio</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white max-w-5xl leading-[1.05]">
            Don't Just Wear It. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-lime via-white to-brand-lime">
              Make It Yours.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-sm sm:text-base md:text-lg text-brand-gray max-w-2xl font-normal leading-relaxed">
            Discover heavyweight streetwear silhouettes. Customize front and back typography, motifs, and graphics in real-time. Delivered directly from our Bengaluru micro-factory.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/design-studio"
              className="w-full sm:w-auto px-8 py-4 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-glow transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Start Designing in Studio
            </Link>
            <Link
              href="/shop"
              className="w-full sm:w-auto px-8 py-4 bg-canvas-card hover:bg-canvas-subtle border border-canvas-border hover:border-brand-lime/50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Explore Collection
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Key Trust Signals */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-t border-canvas-border/80 pt-8 w-full max-w-4xl">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-brand-lime shrink-0" />
              <div>
                <div className="text-xs font-bold text-white font-mono">240-400 GSM</div>
                <div className="text-[11px] text-brand-gray">Archival Heavyweight Drape</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-brand-lime shrink-0" />
              <div>
                <div className="text-xs font-bold text-white font-mono">Digital DTG</div>
                <div className="text-[11px] text-brand-gray">300 DPI High Resolution</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-brand-lime shrink-0" />
              <div>
                <div className="text-xs font-bold text-white font-mono">Zero Minimums</div>
                <div className="text-[11px] text-brand-gray">Order 1 Piece or 100</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-brand-lime shrink-0" />
              <div>
                <div className="text-xs font-bold text-white font-mono">Free Shipping</div>
                <div className="text-[11px] text-brand-gray">On orders above ₹999</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="collection-wheel-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-brand-lime">In rotation</p>
            <h2 id="collection-wheel-title" className="text-2xl sm:text-3xl font-black tracking-tight mt-1">Find your next look.</h2>
          </div>
          <p className="text-xs text-muted-foreground">Scroll, drag, or use the arrow keys to explore.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-canvas-border">
          <WorksWheelDemo />
        </div>
      </section>

      {/* 2. FEATURED CATEGORIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-2">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
              Silhouettes
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Shop by Category
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs font-mono text-brand-gray hover:text-brand-lime flex items-center gap-1 transition-colors"
          >
            View all 9 categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {[
            { name: 'Classic T-Shirts', slug: 't-shirts', count: 'From ₹899', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500' },
            { name: 'Oversized Fits', slug: 'oversized', count: 'From ₹1,199', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500' },
            { name: '400 GSM Hoodies', slug: 'hoodies', count: 'From ₹2,499', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500' },
            { name: 'Sweatshirts', slug: 'sweatshirts', count: 'From ₹1,799', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500' },
            { name: 'Pique Polos', slug: 'polo', count: 'From ₹1,499', image: 'https://images.unsplash.com/photo-1625910513413-5b8214227f4f?w=500' },
            { name: 'Bottoms & Denim', slug: 'bottoms', count: 'From ₹1,199', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500' },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop/${cat.slug}`}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-canvas-card border border-canvas-border hover:border-brand-lime/60 transition-all"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3.5 flex flex-col justify-end">
                <span className="text-xs font-bold text-white group-hover:text-brand-lime transition-colors">
                  {cat.name}
                </span>
                <span className="text-[10px] text-brand-gray font-mono mt-0.5">
                  {cat.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. TRENDING PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-2">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
              Curated Selection
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Trending Apparel Drops
            </h2>
          </div>
          <Link
            href="/shop"
            className="text-xs font-mono text-brand-gray hover:text-brand-lime flex items-center gap-1 transition-colors"
          >
            Explore all {allProducts.length} garments <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. DESIGN STUDIO SPOTLIGHT BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl bg-canvas-card border border-canvas-border overflow-hidden p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-lime/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="flex-1 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-lime/10 text-brand-lime text-xs font-mono font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Live Interactive Studio
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Turn your imagination into premium custom wear.
            </h2>
            <p className="text-sm text-brand-gray leading-relaxed max-w-xl">
              Our 2D Design Studio gives you total control: choose between front and back views, pick curated streetwear typography, load brutalist vector badges, or upload your personal artwork.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/design-studio"
                className="px-6 py-3.5 bg-brand-lime hover:bg-brand-lime-hover text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-glow transition-all hover:scale-105 flex items-center gap-2"
              >
                Launch Custom Studio
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/design-studio"
                className="px-6 py-3.5 bg-canvas-dark border border-canvas-border hover:border-white text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Browse Streetwear Templates
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-[420px] aspect-[4/3] rounded-xl overflow-hidden bg-canvas-dark border border-canvas-border relative shadow-2xl flex items-center justify-center p-4">
            <img
              src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"
              alt="Design Studio Preview"
              className="w-full h-full object-cover rounded-lg opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6">
              <span className="text-brand-lime font-mono text-xs font-bold uppercase">
                Vector Precision
              </span>
              <span className="text-white font-bold text-sm">
                Front & Back 300 DPI Direct-to-Garment Output
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="text-xs font-mono uppercase tracking-widest text-brand-lime">
            Seamless Workflow
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            How THREADLAB Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Select Garment',
              desc: 'Choose from 240 GSM tees, acid-washed oversized fits, or 400 GSM heavyweight hoodies.',
            },
            {
              step: '02',
              title: 'Design in 2D Studio',
              desc: 'Add custom text, curated graphic stickers, or upload your high-resolution original artwork.',
            },
            {
              step: '03',
              title: 'Preview & Validate',
              desc: 'Inspect normalized front and back print areas with live total price calculations in ₹.',
            },
            {
              step: '04',
              title: 'Printed & Delivered',
              desc: 'Produced at our Bengaluru micro-factory with heat-pressed eco inks and shipped nationwide.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-6 bg-canvas-card border border-canvas-border rounded-xl space-y-3 relative overflow-hidden"
            >
              <span className="text-3xl font-black font-mono text-brand-lime/20 block">
                {item.step}
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {item.title}
              </h3>
              <p className="text-xs text-brand-gray leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
