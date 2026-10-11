import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CatalogueCard } from "@/lib/catalogue/query";
import { CatalogueImage, PhotoUnavailable } from "./catalogue-image";
import { formatPrice } from "@/lib/utils";

export function ProductCard({ product: p }: { product: CatalogueCard }) {
  const image = p.images[0];
  return <article className="product-card catalogue-card">
    <Link href={`/products/${p.slug}`} className="product-card-link">
      <div className="product-image">{image ? <CatalogueImage key={image.id} id={image.id} alt={image.alt} /> : <PhotoUnavailable />}<span className="product-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span></div>
      <p className="product-category">{p.category}</p><h2>{p.name}</h2>
      <p className="catalogue-price">{p.price_paise > 0 ? formatPrice(p.price_paise) : "Price unavailable"}</p>
      <p className="product-caption">{p.variants.some(v => v.stock > 0) ? "View sizes & details" : "Currently unavailable"}</p>
    </Link>
  </article>;
}
