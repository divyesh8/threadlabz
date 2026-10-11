import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownWideNarrow, Search, X } from "lucide-react";
import { getCatalogue, PAGE_SIZE } from "@/features/catalogue/services/catalogue";
import { catalogueHref, type CatalogueFilters } from "@/features/catalogue/schemas/catalogue";
import { ProductCard } from "@/features/catalogue/components/product-card";

export const metadata: Metadata = { title: "The Collection", description: "Explore ThreadLabz clothing, costumes and accessories. Ordering is not yet available." };
export const dynamic = "force-dynamic";

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const result = await getCatalogue(await searchParams);
  const f = result.filters;
  const chips = [
    ["q", f.q && `Search: ${f.q}`],
    ["category", f.category && (result.categories.find(c => c.slug === f.category)?.name ?? f.category)],
    ["festival", f.festival && (result.festivals.find(v => v.slug === f.festival)?.name ?? f.festival)],
    ["size", f.size && `Size: ${f.size}`],
    ["min", f.min !== undefined && `From ₹${f.min}`],
    ["max", f.max !== undefined && `Up to ₹${f.max}`],
    ["availability", f.availability && (f.availability === "in-stock" ? "In stock" : "Out of stock")],
    ["sort", f.sort !== "newest" && (f.sort === "price-asc" ? "Price: low to high" : "Price: high to low")],
  ].filter(([, label]) => label) as [keyof CatalogueFilters, string][];
  const empty = result.state === "empty";
  const ready = result.state === "ready";
  return <div className="page-width shop-page">
    <header className="collection-heading"><div><p className="eyebrow">The ThreadLabz collection</p><h1>Find your <span>next favourite.</span></h1></div><p>Everyday expression. Big celebrations.<br />Explore the collection. Ordering isn’t open yet.</p></header>
    {result.categories.length > 0 && <nav className="collection-departments" aria-label="Collection departments"><Link href={catalogueHref(f, { category: undefined, page: 1 })} aria-current={!f.category ? "page" : undefined}>All pieces</Link>{result.categories.map(c => <Link key={c.id} href={catalogueHref(f, { category: c.slug, page: 1 })} aria-current={f.category === c.slug ? "page" : undefined}>{c.name}</Link>)}</nav>}
    {result.state !== "preview" && result.state !== "unavailable" && <details className="filter-panel" key={catalogueHref(f)}>
      <summary><span><ArrowDownWideNarrow size={18} aria-hidden="true" /> Filter & sort {chips.length > 0 && <span className="filter-count">{chips.length}</span>}</span><span className="filter-summary-note">Search, sizes & price</span></summary>
      <form action="/shop" className="catalogue-filters">
        <div className="filter-search"><label htmlFor="catalogue-query">Search the collection</label><div className="filter-search-control"><input id="catalogue-query" name="q" defaultValue={f.q} maxLength={100} type="search" placeholder="What are you looking for?" /><button type="submit" aria-label="Search collection"><Search size={19} /></button></div></div>
        <div><label htmlFor="category-filter">Category</label><select id="category-filter" name="category" defaultValue={f.category ?? ""}><option value="">All categories</option>{result.categories.map(c => <option value={c.slug} key={c.id}>{c.name}</option>)}</select></div>
        <div><label htmlFor="festival-filter">Festival</label><select id="festival-filter" name="festival" defaultValue={f.festival ?? ""}><option value="">All festivals</option>{result.festivals.map(v => <option value={v.slug} key={v.id}>{v.name}</option>)}</select></div>
        <div><label htmlFor="sort-filter">Sort by</label><select id="sort-filter" name="sort" defaultValue={f.sort}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div>
        {result.sizes.length > 0 && <div><label htmlFor="size-filter">Available size</label><select id="size-filter" name="size" defaultValue={f.size ?? ""}><option value="">All sizes</option>{f.size && !result.sizes.includes(f.size) && <option value={f.size}>{f.size} (unavailable)</option>}{result.sizes.map(size => <option key={size}>{size}</option>)}</select></div>}
        {result.sizes.length === 0 && f.size && <input type="hidden" name="size" value={f.size} />}
        <div><label htmlFor="price-min">Minimum price (₹)</label><input type="number" inputMode="decimal" min="0" max="1000000" step="0.01" name="min" id="price-min" defaultValue={f.min ?? ""} placeholder="0" /></div>
        <div><label htmlFor="price-max">Maximum price (₹)</label><input type="number" inputMode="decimal" min="0" max="1000000" step="0.01" name="max" id="price-max" defaultValue={f.max ?? ""} placeholder="No maximum" /></div>
        <div><label htmlFor="availability-filter">Availability</label><select id="availability-filter" name="availability" defaultValue={f.availability ?? ""}><option value="">All availability</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select></div>
        <div className="filter-actions"><button type="submit">Apply filters</button><Link href="/shop">Clear all</Link></div>
      </form>
    </details>}
    {chips.length > 0 && <nav className="active-filters" aria-label="Active filters">{chips.map(([key, label]) => <Link key={key} href={catalogueHref(f, { [key]: key === "q" ? "" : key === "sort" ? "newest" : undefined, page: 1 })} aria-label={`Remove ${label}`}>{label}<X size={14} aria-hidden="true" /></Link>)}<Link href="/shop" className="clear-all">Clear all</Link></nav>}
    {ready ? <><div className="results-bar" role="status"><p>{result.total} {result.total === 1 ? "piece" : "pieces"}<span> / Showing {(result.page - 1) * PAGE_SIZE + 1}–{Math.min(result.page * PAGE_SIZE, result.total)}</span></p><p>{f.sort === "newest" ? "Newest first" : f.sort === "price-asc" ? "Price: low to high" : "Price: high to low"}</p></div><div className="product-grid catalogue-results">{result.products.map(p => <ProductCard key={p.id} product={p} />)}</div></> : <section className="catalogue-state" role="status"><p className="eyebrow">{empty ? "A little room for discovery" : "The collection"}</p><h2>{result.state === "preview" ? "The collection is taking shape." : result.state === "invalid" ? "Let’s adjust those filters." : result.state === "unavailable" ? "We couldn’t load the catalogue." : result.total > 0 ? "There are no pieces on this page." : "No pieces to show just yet."}</h2><p>{result.state === "preview" ? "Our live catalogue isn’t connected. Product details and photography will appear here when they’re ready." : result.state === "invalid" ? "Use a valid category, size or price range, then try again." : result.state === "unavailable" ? "Please try again in a little while." : chips.length ? "Try a different selection or explore the whole collection." : "We’re preparing product photography and details. Ordering remains unavailable."}</p><Link className="retry-button" href={result.total > 0 ? catalogueHref(f, { page: 1 }) : "/shop"}>{result.state === "unavailable" ? "Try again" : result.total > 0 ? "Back to page 1" : "View all pieces"}</Link></section>}
    {(ready || empty) && (result.page > 1 || result.hasMore) && <nav className="catalogue-pagination" aria-label="Catalogue pages">{result.page > 1 && <Link href={catalogueHref(f, { page: result.page - 1 })}>← Previous page</Link>}<span aria-current="page">Page {result.page}{result.total > 0 ? ` of ${Math.ceil(result.total / PAGE_SIZE)}` : ""}</span>{result.hasMore && <Link href={catalogueHref(f, { page: result.page + 1 })}>Next page →</Link>}</nav>}
  </div>;
}
