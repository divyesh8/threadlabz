import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { categories, previews } from "@/lib/catalog-preview";
import { SectionHeading } from "@/components/store/section-heading";
import { getCatalogue } from "@/lib/catalogue/query";
import { CatalogueImage } from "@/components/store/catalogue-image";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "The Collection" };
export const dynamic = "force-dynamic";

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const result = await getCatalogue(params);
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const selectedCategory = typeof params.category === "string" ? params.category : "";
  const selectedFestival = typeof params.festival === "string" ? params.festival : "";
  const filter = q || selectedCategory || selectedFestival;
  const preview = result.state === "preview";
  const pageLink = (page: number) => {
    const search = new URLSearchParams({ page: String(page) });
    if (q) search.set("q", q);
    if (selectedCategory) search.set("category", selectedCategory);
    if (selectedFestival) search.set("festival", selectedFestival);
    return `/shop?${search}`;
  };

  return (
    <div className="page-width shop-preview">
      <SectionHeading
        outline="Meet your"
        solid="next favourite."
        eyebrow={preview ? "The collection / Preview" : "The collection"}
      />
      <p className="shop-intro">
        {preview
          ? "A first look at the ThreadLabz moodboard. These editorial previews are not verified products."
          : "Explore the published collection. Checkout and ordering are not open yet."}
      </p>
      {preview ? (
        <>
          <div className="filter-notice" role="status">
            {filter ? `You’re exploring “${filter.replaceAll("-", " ").slice(0, 100)}”. ` : ""}
            The live catalogue isn’t connected yet. Preview photos do not have verified prices or stock.{" "}
            {filter && <Link href="/shop">Clear selection</Link>}
          </div>
          <nav className="shop-chips category-chips" aria-label="Departments">
            {categories.map((c) => (
              <Link href={`/shop?category=${c.slug}`} key={c.slug}>
                {c.name}
              </Link>
            ))}
          </nav>
          <div className="product-grid">
            {previews.map((p) => (
              <article className="product-card" key={p.name}>
                <div className="product-image">
                  <Image src={p.image} alt={`${p.name} collection preview`} fill sizes="(max-width: 640px) 45vw, 25vw" />
                </div>
                <p className="product-category">{p.category}</p>
                <h2>{p.name}</h2>
                <p className="product-caption">Collection preview · Not yet for sale</p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          {result.state !== "unavailable" && (
            <form action="/shop" className="catalogue-filters">
              <div>
                <label htmlFor="catalogue-query">Search the collection</label>
                <input id="catalogue-query" name="q" defaultValue={q} maxLength={100} type="search" />
              </div>
              <div>
                <label htmlFor="category-filter">Category</label>
                <select id="category-filter" name="category" defaultValue={selectedCategory}>
                  <option value="">All categories</option>
                  {result.categories.map((c) => (
                    <option value={c.slug} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="festival-filter">Festival</label>
                <select id="festival-filter" name="festival" defaultValue={selectedFestival}>
                  <option value="">All festivals</option>
                  {result.festivals.map((f) => (
                    <option value={f.slug} key={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit">Apply filters</button>
              <Link href="/shop">Clear filters</Link>
            </form>
          )}
          <p className="filter-notice" role="status">
            {result.state === "unavailable"
              ? "We couldn’t load the catalogue. Please try again later; no preview items have been substituted."
              : result.state === "invalid"
              ? "That search or filter isn’t valid. Clear the filters and try again."
              : result.state === "empty"
              ? "No published products match this selection yet. Demo fixtures stay private."
              : `${result.products.length} ${
                  result.products.length === 1 ? "product" : "products"
                } on page ${result.page}. Browsing only — orders aren’t open yet.`}
          </p>
          <div className="product-grid catalogue-results">
            {result.products.map((p) => {
              return (
                <article key={p.id} className="product-card">
                  <div className="product-image">
                    {p.image ? (
                      <CatalogueImage id={p.image.id} alt={p.image.alt_text} />
                    ) : (
                      <div className="catalogue-image-empty">Product photo coming soon</div>
                    )}
                  </div>
                  <p className="product-category">{p.category}</p>
                  <h2>{p.name}</h2>
                  <p className="product-caption">{p.description}</p>
                  <p className="catalogue-price">
                    {p.price_paise > 0 ? formatPrice(p.price_paise) : "Price not published"}
                  </p>
                  {p.variants.length > 0 && (
                    <p className="product-caption">
                      Sizes: {[...new Set(p.variants.map((v) => v.size))].join(", ")}
                    </p>
                  )}
                  <p className="product-caption">Ordering not yet available</p>
                </article>
              );
            })}
          </div>
          {(result.page > 1 || result.hasMore) && (
            <nav className="catalogue-pagination" aria-label="Catalogue pages">
              {result.page > 1 && <Link href={pageLink(result.page - 1)}>Previous page</Link>}
              {result.hasMore && <Link href={pageLink(result.page + 1)}>Next page</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
