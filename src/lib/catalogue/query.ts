import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { Category, Festival } from "@/lib/supabase/database.types";
import { catalogueFilters, literalSearch } from "./validation";

export type CatalogueCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  price_paise: number;
  image: { id: string; url: string; alt_text: string } | null;
  variants: { id: string; size: string; colour: string; price_paise: number }[];
};

export type CatalogueResult = {
  state: "preview" | "empty" | "ready" | "unavailable" | "invalid";
  products: CatalogueCard[];
  categories: Category[];
  festivals: Festival[];
  page: number;
  hasMore: boolean;
};

export const PAGE_SIZE = 24;

export async function getCatalogue(input: Record<string, unknown>): Promise<CatalogueResult> {
  const base: CatalogueResult = {
    state: "preview",
    products: [],
    categories: [],
    festivals: [],
    page: 1,
    hasMore: false,
  };

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
    const categoryId = categoryResult.data.find((c) => c.slug === category)?.id;
    const festivalId = festivalResult.data.find((f) => f.slug === festival)?.id;

    if ((category && !categoryId) || (festival && !festivalId)) {
      return { ...base, ...lists, state: "empty" };
    }

    let query = client
      .from("products")
      .select("id, slug, title, description, category_id, price_paise, created_at, product_festivals(festival_id)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (q) query = query.ilike("title", `%${literalSearch(q)}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (festivalId) {
      query = query.eq("product_festivals.festival_id", festivalId).not("product_festivals", "is", null);
    }

    const { data, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    if (error || !data) return { ...base, ...lists, state: "unavailable" };
    if (!data.length) return { ...base, ...lists, state: "empty" };

    const products = data.slice(0, PAGE_SIZE);
    const ids = products.map((p) => p.id);

    const [imagesRes, variantsRes] = await Promise.all([
      client
        .from("product_images")
        .select("id, product_id, url, alt, sort_order, is_primary")
        .in("product_id", ids)
        .order("sort_order"),
      client
        .from("product_variants")
        .select("id, product_id, size, color, stock, sku")
        .in("product_id", ids),
    ]);

    if (imagesRes.error || variantsRes.error) return { ...base, ...lists, state: "unavailable" };

    const images = imagesRes.data;
    const variants = variantsRes.data;

    return {
      ...base,
      ...lists,
      state: "ready",
      hasMore: data.length > PAGE_SIZE,
      products: products.map((p) => {
        const prodImages = images.filter((img) => img.product_id === p.id);
        const primaryImg = prodImages.find((img) => img.is_primary) ?? prodImages[0] ?? null;
        const prodVariants = variants.filter((v) => v.product_id === p.id);

        return {
          id: p.id,
          slug: p.slug,
          name: p.title,
          description: p.description,
          category: categoryResult.data.find((c) => c.id === p.category_id)?.name ?? "Collection",
          price_paise: p.price_paise,
          image: primaryImg
            ? {
                id: primaryImg.id,
                url: primaryImg.url,
                alt_text: primaryImg.alt || primaryImg.url,
              }
            : null,
          variants: prodVariants.map((v) => ({
            id: v.id,
            size: v.size,
            colour: v.color,
            price_paise: p.price_paise,
          })),
        };
      }),
    };
  } catch {
    return { ...base, state: "unavailable" };
  }
}
