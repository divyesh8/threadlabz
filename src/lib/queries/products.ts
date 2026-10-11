import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type {
  Product,
  Category,
  Festival,
  ProductVariant,
  ProductImage,
} from "@/lib/supabase/database.types";

export type ProductCard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  badge: string | null;
  total_sold: number;
  category_name?: string;
  category_slug?: string;
  primary_image: string | null;
  images: { id: string; url: string; alt: string | null; sort_order: number; is_primary: boolean }[];
  variants: { id: string; size: string; color: string; stock: number; sku: string | null }[];
};

export type ProductWithDetails = Product & {
  category: Category | null;
  variants: ProductVariant[];
  images: ProductImage[];
  festivals: Festival[];
};

type RawProductItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  badge: string | null;
  total_sold: number;
  is_active: boolean;
  created_at: string;
  categories: { id: string; name: string; slug: string } | null;
  product_images: {
    id: string;
    url: string;
    alt: string | null;
    sort_order: number;
    is_primary: boolean;
  }[];
  product_variants: {
    id: string;
    size: string;
    color: string;
    stock: number;
    sku: string | null;
  }[];
};

function formatProductCards(
  products: RawProductItem[],
  categoriesMap: Map<string, Category> = new Map()
): ProductCard[] {
  return products.map((p) => {
    const cat = p.category_id ? categoriesMap.get(p.category_id) : undefined;
    const imagesList = Array.isArray(p.product_images)
      ? [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)
      : [];
    const primaryImg =
      imagesList.find((i) => i.is_primary)?.url ??
      imagesList[0]?.url ??
      null;

    const variantsList = Array.isArray(p.product_variants) ? p.product_variants : [];

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      price_paise: p.price_paise,
      compare_at_paise: p.compare_at_paise,
      badge: p.badge,
      total_sold: p.total_sold,
      category_name: p.categories?.name ?? cat?.name,
      category_slug: p.categories?.slug ?? cat?.slug,
      primary_image: primaryImg,
      images: imagesList.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      })),
      variants: variantsList.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        sku: v.sku,
      })),
    };
  });
}

/**
 * 1. New arrivals: the newest eight active products.
 */
export async function getNewArrivals(limit = 8): Promise<ProductCard[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("products")
      .select(`
        id, title, slug, description, category_id, price_paise, compare_at_paise,
        badge, total_sold, is_active, created_at,
        categories ( id, name, slug ),
        product_images ( id, url, alt, sort_order, is_primary ),
        product_variants ( id, size, color, stock, sku )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return formatProductCards(data as unknown as RawProductItem[]);
  } catch {
    return [];
  }
}

/**
 * 2. Trending products: ordered by total_sold.
 */
export async function getTrendingProducts(limit = 8): Promise<ProductCard[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("products")
      .select(`
        id, title, slug, description, category_id, price_paise, compare_at_paise,
        badge, total_sold, is_active, created_at,
        categories ( id, name, slug ),
        product_images ( id, url, alt, sort_order, is_primary ),
        product_variants ( id, size, color, stock, sku )
      `)
      .eq("is_active", true)
      .order("total_sold", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return formatProductCards(data as unknown as RawProductItem[]);
  } catch {
    return [];
  }
}

/**
 * 3. Products by category slug.
 */
export async function getProductsByCategorySlug(
  slug: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ products: ProductCard[]; category: Category | null; total: number }> {
  const client = createPublicSupabaseClient();
  if (!client) return { products: [], category: null, total: 0 };

  const limit = options.limit ?? 24;
  const offset = options.offset ?? 0;

  try {
    const { data: category, error: catError } = await client
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (catError || !category) {
      return { products: [], category: null, total: 0 };
    }

    const { data, error, count } = await client
      .from("products")
      .select(`
        id, title, slug, description, category_id, price_paise, compare_at_paise,
        badge, total_sold, is_active, created_at,
        categories ( id, name, slug ),
        product_images ( id, url, alt, sort_order, is_primary ),
        product_variants ( id, size, color, stock, sku )
      `, { count: "exact" })
      .eq("category_id", category.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return { products: [], category, total: 0 };
    }

    return {
      products: formatProductCards(data as unknown as RawProductItem[]),
      category,
      total: count ?? data.length,
    };
  } catch {
    return { products: [], category: null, total: 0 };
  }
}

/**
 * 4. Products by festival slug.
 */
export async function getProductsByFestivalSlug(
  slug: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ products: ProductCard[]; festival: Festival | null; total: number }> {
  const client = createPublicSupabaseClient();
  if (!client) return { products: [], festival: null, total: 0 };

  const limit = options.limit ?? 24;
  const offset = options.offset ?? 0;

  try {
    const { data: festival, error: festError } = await client
      .from("festivals")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (festError || !festival) {
      return { products: [], festival: null, total: 0 };
    }

    const { data: pfJunction, error: pfError } = await client
      .from("product_festivals")
      .select("product_id")
      .eq("festival_id", festival.id);

    if (pfError || !pfJunction || pfJunction.length === 0) {
      return { products: [], festival, total: 0 };
    }

    const productIds = pfJunction.map((pf) => pf.product_id);

    const { data, error, count } = await client
      .from("products")
      .select(`
        id, title, slug, description, category_id, price_paise, compare_at_paise,
        badge, total_sold, is_active, created_at,
        categories ( id, name, slug ),
        product_images ( id, url, alt, sort_order, is_primary ),
        product_variants ( id, size, color, stock, sku )
      `, { count: "exact" })
      .in("id", productIds)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return { products: [], festival, total: 0 };
    }

    return {
      products: formatProductCards(data as unknown as RawProductItem[]),
      festival,
      total: count ?? data.length,
    };
  } catch {
    return { products: [], festival: null, total: 0 };
  }
}

/**
 * 5. Single product by slug, including its variants and images.
 */
export async function getProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  const client = createPublicSupabaseClient();
  if (!client) return null;

  try {
    const { data: product, error } = await client
      .from("products")
      .select(`
        *,
        categories ( * ),
        product_images ( * ),
        product_variants ( * ),
        product_festivals (
          festival_id,
          festivals ( * )
        )
      `)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !product) return null;

    type RawJoinedProduct = Product & {
      categories: Category | null;
      product_images: ProductImage[];
      product_variants: ProductVariant[];
      product_festivals: { festival_id: string; festivals: Festival | null }[];
    };

    const p = product as unknown as RawJoinedProduct;

    const images = Array.isArray(p.product_images)
      ? [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)
      : [];

    const variants = Array.isArray(p.product_variants)
      ? [...p.product_variants].sort((a, b) => a.size.localeCompare(b.size))
      : [];

    const festivals = Array.isArray(p.product_festivals)
      ? p.product_festivals
          .map((pf) => pf.festivals)
          .filter((f): f is Festival => Boolean(f))
      : [];

    return {
      ...p,
      category: p.categories ?? null,
      images,
      variants,
      festivals,
    };
  } catch {
    return null;
  }
}
