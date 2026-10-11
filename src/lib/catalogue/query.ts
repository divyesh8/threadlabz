import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { Category, Product, ProductImage, Variant } from "@/lib/supabase/database.types";
import { catalogueFilters, literalSearch } from "./validation";

export type CatalogueCard = Pick<Product, "id" | "name" | "description" | "slug"> & {
  category: string; variants: Pick<Variant, "id" | "size" | "colour" | "price_paise">[];
  image: Pick<ProductImage, "id" | "alt_text"> | null;
};
export type CatalogueResult = {
  state: "preview" | "empty" | "ready" | "unavailable" | "invalid";
  products: CatalogueCard[]; categories: Category[]; festivals: Category[];
  page: number; hasMore: boolean;
};
export const PAGE_SIZE = 24;

export async function getCatalogue(input: Record<string, unknown>): Promise<CatalogueResult> {
  const base: CatalogueResult = { state: "preview", products: [], categories: [], festivals: [], page: 1, hasMore: false };
  const parsed = catalogueFilters.safeParse(input);
  if (!parsed.success) return { ...base, state: "invalid" };
  const { q, category, festival, page } = parsed.data;
  const client = createPublicSupabaseClient();
  if (!client) return base;
  try {
    const [categoryResult, festivalResult] = await Promise.all([
      client.from("categories").select("*").eq("is_active", true).order("name"),
      client.from("festivals").select("*").eq("is_active", true).order("name"),
    ]);
    if (categoryResult.error || festivalResult.error) return { ...base, state: "unavailable" };
    const lists = { categories: categoryResult.data, festivals: festivalResult.data, page };
    const categoryId = categoryResult.data.find(c => c.slug === category)?.id;
    const festivalId = festivalResult.data.find(f => f.slug === festival)?.id;
    if ((category && !categoryId) || (festival && !festivalId)) return { ...base, ...lists, state: "empty" };
    // Filter inside PostgREST, not a potentially truncated client-side ID list.
    let query = client.from("products").select("id,slug,name,description,category_id,product_festivals(festival_id)")
      .eq("status", "published").eq("is_active", true).eq("is_demo", false)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false }).order("id");
    if (q) query = query.ilike("name", `%${literalSearch(q)}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (festivalId) query = query.eq("product_festivals.festival_id", festivalId).not("product_festivals", "is", null);
    const { data, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    if (error || !data) return { ...base, ...lists, state: "unavailable" };
    if (!data.length) return { ...base, ...lists, state: "empty" };
    const products = data.slice(0, PAGE_SIZE);
    const ids = products.map(p => p.id);
    const images = await client.from("product_images").select("id,product_id,alt_text,sort_order").in("product_id", ids).eq("is_published", true).eq("sort_order", 0);
    if (images.error) return { ...base, ...lists, state: "unavailable" };
    // Page variants too: the API row cap must not silently omit prices or sizes.
    const variants: Pick<Variant, "id" | "product_id" | "size" | "colour" | "price_paise">[] = [];
    for (let offset = 0; ; offset += 100) {
      if (offset >= 5000) return { ...base, ...lists, state: "unavailable" };
      const batch = await client.from("product_variants").select("id,product_id,size,colour,price_paise")
        .in("product_id", ids).eq("is_active", true).order("id").range(offset, offset + 99);
      if (batch.error) return { ...base, ...lists, state: "unavailable" };
      variants.push(...batch.data);
      if (batch.data.length < 100) break;
    }
    return { ...base, ...lists, state: "ready", hasMore: data.length > PAGE_SIZE, products: products.map(p => ({
      id: p.id, slug: p.slug, name: p.name, description: p.description,
      category: categoryResult.data.find(c => c.id === p.category_id)?.name ?? "Collection",
      image: images.data.find(i => i.product_id === p.id) ?? null,
      variants: variants.filter(v => v.product_id === p.id),
    })) };
  } catch { return { ...base, state: "unavailable" }; }
}
