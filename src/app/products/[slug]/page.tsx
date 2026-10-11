import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/features/catalogue/services/catalogue";
import { parseSiteUrl } from "@/lib/config/site";
import { formatPrice } from "@/lib/utils";
import { ProductGallery } from "@/features/catalogue/components/product-gallery";
import { ProductOptions, ProductActions } from "@/features/catalogue/components/product-options";
import { ProductCard } from "@/features/catalogue/components/product-card";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductDetail(slug);
  if (result.state !== "ready") return { title: result.state === "missing" ? "Product not found" : "Product unavailable", robots: { index: false, follow: false } };
  const p = result.product;
  const origin = parseSiteUrl(process.env.SITE_URL) ?? "https://threadlabz.vercel.app";
  const url = `${origin}/products/${p.slug}`;
  const description = p.description?.slice(0, 160) || `Explore ${p.name} at ThreadLabz. Ordering is not available yet.`;
  const images = p.images[0] ? [{ url: `${origin}/catalogue-image/${p.images[0].id}`, alt: p.images[0].alt }] : [{ url: `${origin}/brand/wordmark.png`, alt: "ThreadLabz" }];
  return { title: p.name, description, alternates: { canonical: url }, robots: { index: false, follow: false }, openGraph: { title: p.name, description, url, type: "website", locale: "en_IN", siteName: "ThreadLabz", images }, twitter: { card: "summary_large_image", title: p.name, description, images } };
}

export default async function ProductPage({ params }: Props) {
  const result = await getProductDetail((await params).slug);
  if (result.state === "missing") notFound();
  if (result.state === "unavailable") return <div className="status-page page-width"><p className="eyebrow">The collection</p><h1>We couldn’t load this product.</h1><p role="status">Please try again in a little while. Product information is temporarily unavailable.</p><Link className="text-link" href="/shop">Back to the collection →</Link></div>;
  if (result.state !== "ready") return null;
  const { product: p, related } = result;
  return <div className="page-width product-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/shop">Collection</Link><span aria-hidden="true">/</span><Link href={`/shop?category=${p.categorySlug}`}>{p.category}</Link><span aria-hidden="true">/</span><span aria-current="page">{p.name}</span></nav>
    <div className="product-layout">
      <div className="product-heading"><p className="eyebrow">ThreadLabz / {p.category}</p><h1>{p.name}</h1><p className="detail-price">{p.price_paise > 0 ? formatPrice(p.price_paise) : "Price unavailable"}</p><ProductActions /></div>
      <ProductGallery images={p.images} name={p.name} />
      <div className="product-information"><ProductOptions variants={p.variants} /><div className="product-description"><h2>About this piece</h2><p>{p.description || "Product details are being prepared. Please check back for more information."}</p></div><div className="product-policy"><h2>Before you order</h2><p>Shipping and returns terms will be published before ordering opens.</p><Link className="text-link" href="/shipping">Shipping & returns status →</Link></div></div>
    </div>
    {related.length > 0 && <section className="related-products"><div className="section-heading"><div><p className="eyebrow">Keep exploring</p><h2>More from {p.category}</h2></div></div><div className="product-grid">{related.map(product => <ProductCard key={product.id} product={product} />)}</div></section>}
  </div>;
}
