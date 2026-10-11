import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { categories, previews } from "@/lib/catalog-preview";
import { SectionHeading } from "@/components/store/section-heading";

export const metadata: Metadata = { title: "The Collection — Preview" };

export default async function Shop({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; festival?: string }> }) {
  const { q, category, festival } = await searchParams;
  const filter = q || category || festival;
  return <div className="page-width shop-preview"><SectionHeading outline="Meet your" solid="next favourite." eyebrow="The collection / Preview" /><p className="shop-intro">A first look at the ThreadLabz moodboard. Product details, prices and shopping will open with our live catalogue.</p>
    {filter && <div className="filter-notice" role="status">You’re exploring “{filter.replaceAll("-", " ").slice(0, 100)}”. Search and filtering will be available with the live catalogue. <Link href="/shop">Clear selection</Link></div>}
    <nav className="shop-chips category-chips" aria-label="Departments">{categories.map(c => <Link href={`/shop?category=${c.slug}`} key={c.slug}>{c.name}</Link>)}</nav>
    <div className="product-grid">{previews.map(p => <article className="product-card" key={p.name}><div className="product-image"><Image src={p.image} alt={`${p.name} collection preview`} fill sizes="(max-width: 640px) 45vw, 25vw" /></div><p className="product-category">{p.category}</p><h2>{p.name}</h2><p className="product-caption">Collection preview · Not yet for sale</p></article>)}</div>
  </div>;
}
