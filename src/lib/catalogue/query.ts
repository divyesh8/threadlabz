import "server-only";
import { cache } from "react";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Category, Festival, Product, ProductImage, ProductVariant } from "@/lib/supabase/database.types";
import { catalogueFilters, literalSearch, productSlugSchema, type CatalogueFilters } from "./validation";
import { productStoragePath } from "./media";

// The deployed schema uses is_active as publication and source as provenance.
// Unknown imports and seed/demo records remain private until owner curation.
export const PUBLIC_SOURCES = ["admin", "manual"];
export const PAGE_SIZE = 24;
type Client = NonNullable<ReturnType<typeof createPublicSupabaseClient>>;
export type CatalogueImageData = { id: string; alt: string };
export type CatalogueCard = {
  id: string; slug: string; name: string; description: string | null;
  category: string; categorySlug: string; price_paise: number;
  images: CatalogueImageData[]; variants: { id: string; size: string; colour: string; stock: number }[];
};
export type CatalogueResult = {
  state: "preview" | "empty" | "ready" | "unavailable" | "invalid";
  products: CatalogueCard[]; categories: Category[]; festivals: Festival[];
  sizes: string[]; total: number; page: number; hasMore: boolean; filters: CatalogueFilters;
};

function visibleProducts(client: Client) {
  return client.from("products").select("*, categories!inner(id, name, slug, is_active), product_festivals(festival_id), available:product_variants(), sized:product_variants()", { count: "exact" })
    .eq("is_active", true).in("source", PUBLIC_SOURCES).eq("categories.is_active", true);
}

// Page children too: a 24-product page can exceed PostgREST's 100-row cap.
async function children(client: Client, ids: string[]) {
  const images: ProductImage[] = [];
  const variants: ProductVariant[] = [];
  for (let from = 0; from < 10000; from += 100) {
    const [ir, vr] = await Promise.all([
      client.from("product_images").select("*").in("product_id", ids).order("id").range(from, from + 99),
      client.from("product_variants").select("*").in("product_id", ids).order("id").range(from, from + 99),
    ]);
    if (ir.error || vr.error) throw new Error("Catalogue details unavailable");
    images.push(...ir.data); variants.push(...vr.data);
    if (ir.data.length < 100 && vr.data.length < 100) return { images, variants };
  }
  throw new Error("Catalogue detail limit exceeded");
}

type ProductRow = Product & { categories: Pick<Category, "name" | "slug" | "is_active"> };
function toCard(p: ProductRow, images: ProductImage[], variants: ProductVariant[]): CatalogueCard {
  const origin = getSupabaseConfig()?.url ?? "";
  return {
    id: p.id, slug: p.slug, name: p.title, description: p.description,
    category: p.categories.name, categorySlug: p.categories.slug, price_paise: p.price_paise,
    images: images.filter(i => i.product_id === p.id && productStoragePath(i.url, origin))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map(i => ({ id: i.id, alt: i.alt?.trim() || `${p.title} — product photograph` })),
    variants: variants.filter(v => v.product_id === p.id).map(v => ({ id: v.id, size: v.size, colour: v.color, stock: v.stock })),
  };
}

async function availableSizes(client: Client) {
  const sizes = new Set<string>();
  // Bounded server-only facet scan. Never send the inventory dataset to clients.
  for (let from = 0; from < 2000; from += 100) {
    const { data, error } = await client.from("product_variants")
      .select("id, size, products!inner(is_active, source, categories!inner(is_active))")
      .gt("stock", 0).eq("products.is_active", true).in("products.source", PUBLIC_SOURCES)
      .eq("products.categories.is_active", true).order("id").range(from, from + 99);
    if (error) return [];
    data.forEach(v => sizes.add(v.size));
    if (data.length < 100) return [...sizes].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }
  return []; // Hide incomplete facets; add a distinct-size RPC at larger scale.
}

export async function getCatalogue(input: Record<string, unknown>): Promise<CatalogueResult> {
  const base: CatalogueResult = { state: "preview", products: [], categories: [], festivals: [], sizes: [], total: 0, page: 1, hasMore: false, filters: catalogueFilters.parse({}) };
  const parsed = catalogueFilters.safeParse(input);
  if (!parsed.success) return { ...base, state: "invalid" };
  const filters = parsed.data;
  const { q, category, festival, page, sort, size, min, max, availability } = filters;
  Object.assign(base, { filters, page });
  const client = createPublicSupabaseClient();
  if (!client) return base;
  try {
    const [cr, fr, sizes] = await Promise.all([
      client.from("categories").select("*").eq("is_active", true).order("name"),
      client.from("festivals").select("*").eq("is_active", true).order("name"),
      availableSizes(client),
    ]);
    if (cr.error || fr.error) return { ...base, state: "unavailable" };
    Object.assign(base, { categories: cr.data, festivals: fr.data, sizes });
    const categoryId = cr.data.find(c => c.slug === category)?.id;
    const festivalId = fr.data.find(f => f.slug === festival)?.id;
    if ((category && !categoryId) || (festival && !festivalId)) return { ...base, state: "invalid" };
    let query = visibleProducts(client);
    if (q) query = query.ilike("title", `%${literalSearch(q)}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (festivalId) query = query.eq("product_festivals.festival_id", festivalId).not("product_festivals", "is", null);
    if (size) query = query.eq("sized.size", size).gt("sized.stock", 0).not("sized", "is", null);
    if (availability) {
      query = query.gt("available.stock", 0);
      query = availability === "in-stock" ? query.not("available", "is", null) : query.is("available", null);
    }
    if (min !== undefined) query = query.gte("price_paise", Math.round(min * 100));
    if (max !== undefined) query = query.lte("price_paise", Math.round(max * 100));
    query = sort === "newest" ? query.order("created_at", { ascending: false }) : query.order("price_paise", { ascending: sort === "price-asc" });
    const { data, error, count } = await query.order("id").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error || !data || count === null) return { ...base, state: "unavailable" };
    if (!data.length) return { ...base, state: "empty", total: count };
    const { images, variants } = await children(client, data.map(p => p.id));
    return { ...base, state: "ready", total: count, hasMore: page * PAGE_SIZE < count && page < 1000, products: data.map(p => toCard(p, images, variants)) };
  } catch { return { ...base, state: "unavailable" }; }
}

export const getProductDetail = cache(async (slug: string): Promise<{ state: "ready"; product: CatalogueCard; related: CatalogueCard[] } | { state: "missing" | "unavailable" }> => {
  if (!productSlugSchema.safeParse(slug).success) return { state: "missing" };
  const client = createPublicSupabaseClient();
  if (!client) return { state: "unavailable" };
  try {
    const { data, error } = await visibleProducts(client).eq("slug", slug).maybeSingle();
    if (error) return { state: "unavailable" };
    if (!data) return { state: "missing" };
    const details = await children(client, [data.id]);
    const product = toCard(data, details.images, details.variants);
    const { data: others, error: relatedError } = await visibleProducts(client).eq("category_id", data.category_id!).neq("id", data.id).order("created_at", { ascending: false }).order("id").limit(4);
    let related: CatalogueCard[] = [];
    if (!relatedError && others?.length) {
      try {
        const more = await children(client, others.map(p => p.id));
        related = others.map(p => toCard(p, more.images, more.variants));
      } catch { /* Related items must not break the primary product. */ }
    }
    return { state: "ready", product, related };
  } catch { return { state: "unavailable" }; }
});
