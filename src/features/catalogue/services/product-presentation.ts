import type { CatalogueCard } from "../types/catalogue";

export function availableStock(stock: number, reserved = 0) {
  return Number.isSafeInteger(stock) && Number.isSafeInteger(reserved)
    ? Math.max(0, stock - Math.max(0, reserved)) : 0;
}

// Imported alongside the existing cart contract's 1–10 quantity constraint.
export function quantityLimit(stock: number) {
  return Math.min(10, Math.max(0, stock));
}

export function compareSizes(a: string, b: string) {
  const sizes = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"];
  const rank = (size: string) => sizes.indexOf(size.toUpperCase().replace(/^2XL$/, "XXL").replace(/^XXXL$/, "3XL"));
  const left = rank(a), right = rank(b);
  if (left >= 0 || right >= 0) return left < 0 ? 1 : right < 0 ? -1 : left - right;
  return a.localeCompare(b, "en", { numeric: true });
}

export function colourLabel(colour: string) {
  return /^(default|standard)$/i.test(colour.trim()) ? "Colour not specified" : colour.trim() || "Colour not specified";
}

export function productStructuredData(product: CatalogueCard, origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${origin}/products/${product.slug}`,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length ? { image: product.images.map(image => `${origin}/catalogue-image/${image.id}`) } : {}),
    brand: { "@type": "Brand", name: "ThreadLabz" },
    category: product.category,
    // Checkout remains gated. Do not advertise an executable Offer or delivery promise.
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
