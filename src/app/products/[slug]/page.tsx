import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/features/catalogue/services/catalogue";
import { parseSiteUrl } from "@/lib/config/site";
import { formatPrice } from "@/lib/utils";
import { ProductGallery } from "@/features/catalogue/components/product-gallery";
import { ProductOptions } from "@/features/catalogue/components/product-options";
import { ProductCard } from "@/features/catalogue/components/product-card";
import { ProductInformation, ProductPolicies, ProductSizeGuide } from "@/features/catalogue/components/product-information";
import { getShoppingPolicies } from "@/features/catalogue/services/delivery";
import { productStructuredData, serializeStructuredData } from "@/features/catalogue/services/product-presentation";
import "@/features/catalogue/components/product-detail.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductDetail(slug);
  if (result.state !== "ready") return { title: result.state === "missing" ? "Product not found" : "Product unavailable", robots: { index: false, follow: false } };
  const p = result.product;
  const origin = parseSiteUrl(process.env.SITE_URL) ?? "https://threadlabz.vercel.app";
  const url = `${origin}/products/${p.slug}`;
  const description = p.description?.slice(0, 160) || `Explore ${p.name} at ThreadLabz. View product photographs, sizes and availability.`;
  const images = p.images[0] ? [{ url: `${origin}/catalogue-image/${p.images[0].id}`, alt: p.images[0].alt }] : [{ url: `${origin}/brand/wordmark.png`, alt: "ThreadLabz" }];
  return { title: p.name, description, alternates: { canonical: url }, robots: { index: false, follow: false }, openGraph: { title: p.name, description, url, type: "website", locale: "en_IN", siteName: "ThreadLabz", images }, twitter: { card: "summary_large_image", title: p.name, description, images } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const result = await getProductDetail(slug);
  if (result.state === "missing") notFound();
  if (result.state === "unavailable") return <div className="status-page page-width"><p className="eyebrow">The collection</p><h1>We couldn’t load this product.</h1><p role="status">Please try again in a little while. Product information is temporarily unavailable.</p><a className="retry-button" href={`/products/${encodeURIComponent(slug)}`}>Try again</a><Link className="text-link" href="/shop">Back to the collection →</Link></div>;
  if (result.state !== "ready") return null;
  const { product: p, related } = result;
  const origin = parseSiteUrl(process.env.SITE_URL) ?? "https://threadlabz.vercel.app";
  return <div className="pdp-view"><div className="page-width product-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(productStructuredData(p, origin)) }} />
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/shop">Collection</Link><span aria-hidden="true">/</span><Link href={`/shop?category=${p.categorySlug}`}>{p.category}</Link><span aria-hidden="true">/</span><span aria-current="page">{p.name}</span></nav>
    <div className="product-layout">
      <div className="product-heading"><p className="eyebrow">ThreadLabz / {p.category}</p><h1>{p.name}</h1><p className="detail-price">{p.price_paise > 0 ? formatPrice(p.price_paise) : "Price unavailable"}</p></div>
      <ProductGallery key={p.id} images={p.images} name={p.name} />
      <div className="product-information">
        <ProductOptions key={p.id} variants={p.variants} pricePaise={p.price_paise} sizeGuide={<ProductSizeGuide guide={p.details.size_guide} name={p.name} />} />
        <p className="pdp-caption checkout-status">You can save items in your bag. Checkout is not open yet.</p>
        <ProductInformation description={p.description} details={p.details} />
        <ProductPolicies policies={getShoppingPolicies()} />
      </div>
    </div>
    {related.length > 0 && <section className="related-products"><div className="section-heading"><div><p className="eyebrow">Keep exploring</p><h2>More from {p.category}</h2></div></div><div className="product-grid">{related.map(product => <ProductCard key={product.id} product={product} />)}</div></section>}
  </div></div>;
}
