import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Box, ShieldCheck, Truck, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";
import { categories, festivals, festivalSlug, previews } from "@/features/catalogue/data/preview";
import { getCatalogue } from "@/features/catalogue/services/catalogue";
import { ProductCard } from "@/features/catalogue/components/product-card";

export function TrustStrip() {
  return <div className="trust-strip" aria-label="Our approach">
    {[{ icon: Truck, title: "India in mind", text: "Everyday & celebration" }, { icon: Box, title: "Explore the collection", text: "Find your next favourite" }, { icon: ShieldCheck, title: "Browsing for now", text: "Ordering not yet open" }].map(({ icon: Icon, title, text }) => <div key={title}><span className="trust-icon"><Icon strokeWidth={1.5} /></span><p><strong>{title}</strong><span>{text}</span></p></div>)}
  </div>;
}

export function Categories() {
  return <section className="store-section" id="categories"><SectionHeading outline="Shop by" solid="Category" href="/shop" eyebrow="Find your everyday favourites" /><div className="category-grid">
    {categories.map((category) => <Link className="category-card" href={`/shop?category=${category.slug}`} key={category.slug}><Image src={category.image} alt={category.name === "Men" ? "Black knit polo from the supplied menswear collection" : `${category.name} collection illustration — photography coming soon`} fill sizes="(max-width: 640px) 45vw, 25vw" /><div className="category-label"><div><h3>{category.name}</h3><span>{category.detail}</span></div><ArrowUpRight size={22} aria-hidden="true" /></div></Link>)}
  </div></section>;
}

export async function NewArrivals() {
  const catalogue = await getCatalogue({});
  if (catalogue.state === "ready") return <section className="store-section" id="new-arrivals"><SectionHeading outline="The latest" solid="pieces" href="/shop" eyebrow="Explore the collection" /><div className="product-grid">{catalogue.products.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}</div></section>;
  return <section className="store-section" id="new-arrivals"><SectionHeading outline="On our" solid="Moodboard" href="/shop" eyebrow="Reference photography / not products for sale" /><div className="product-grid">
    {previews.map((product) => <article className="product-card" key={product.name}><div className="product-image"><Image src={product.image} alt={`${product.name} — reference photography, not a verified product`} fill sizes="(max-width: 640px) 45vw, 25vw" /><span className="new-badge">Moodboard</span></div><p className="product-category">{product.category}</p><h3>{product.name}</h3><p className="product-caption">Reference photograph · Not for sale</p></article>)}
  </div></section>;
}

export function FestiveBanner() {
  return <section className="festive-banner"><div><p className="eyebrow">Good times. Great outfits.</p><h2><span className="outline-word">Festive fits.</span><br />Full-on celebration.</h2><p>For the moments that deserve a little extra.</p><Button variant="secondary" asChild><Link href="/#festivals">Explore the festive edit <ArrowRight /></Link></Button></div><div className="festive-art" aria-hidden="true"><span className="festive-ring ring-one" /><span className="festive-ring ring-two" /><span className="festive-star">✳</span><span className="festive-small-star">✦</span><span className="festive-word">Celebrate<br /><em>your way.</em></span></div></section>;
}

export function Festivals() {
  return <section className="store-section" id="festivals"><SectionHeading outline="Shop by" solid="Festival" eyebrow="20 reasons to dress up" href="/shop" /><div className="festival-grid">{festivals.map(([name, emoji]) => <Link key={name} href={`/shop?festival=${festivalSlug(name)}`} className="festival-card"><span className="festival-emoji" aria-hidden="true">{emoji === "🇮🇳" ? <Image src="/images/placeholders/india.svg" width={40} height={27} alt="" /> : emoji}</span><span>{name}</span></Link>)}</div></section>;
}

export function TrendingCostumes() {
  const costumes = [
    ["Little legends", "For their big stage moment", "kids"],
    ["Festive favourites", "Celebration, head to toe", "women"],
    ["Everyday main character", "A look that’s all you", "accessories"],
  ];
  return <section className="store-section"><SectionHeading outline="Imagine" solid="the occasion" eyebrow="Costume concepts / on our moodboard" href="/shop?category=fancy-dress" /><div className="costume-grid">{costumes.map(([name, text, art]) => <Link className="costume-card" href="/shop?category=fancy-dress" key={name}><div className="costume-image"><Image src={`/images/placeholders/${art}.svg`} alt={`${name} concept illustration; costume photography coming soon`} fill sizes="(max-width: 640px) 65vw, 33vw" /><span className="rank-badge">Concept illustration</span></div><h3>{name}</h3><p>{text}</p></Link>)}</div><p className="section-note">A little inspiration. These illustrations do not represent published products.</p></section>;
}

export function Newsletter() {
  return <section className="newsletter" aria-labelledby="newsletter-heading"><div><p className="eyebrow">Your next favourite starts here</p><h2 id="newsletter-heading">Join the <span className="outline-word">Thread.</span></h2><p>Fresh drops, festive edits, and a little inbox joy.</p><div className="newsletter-coming"><WandSparkles size={20} /><span>We’re getting our newsletter ready.<br /><strong>Email sign-ups are not open yet.</strong></span></div></div><div className="newsletter-seal" aria-hidden="true"><span>Make your mark</span><strong>TL</strong><span>Everyday. Your way.</span><span className="seal-star">✳</span></div></section>;
}
