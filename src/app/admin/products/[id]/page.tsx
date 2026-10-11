import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const client = await createServerSupabaseClient();

  if (!client) {
    notFound();
  }

  const [
    { data: product, error: prodError },
    { data: variants },
    { data: images },
    { data: prodFestivals },
    { data: categories },
    { data: festivals },
  ] = await Promise.all([
    client.from("products").select("*").eq("id", id).maybeSingle(),
    client.from("product_variants").select("*").eq("product_id", id),
    client.from("product_images").select("*").eq("product_id", id).order("sort_order", { ascending: true }),
    client.from("product_festivals").select("festival_id").eq("product_id", id),
    client.from("categories").select("id, name").order("name", { ascending: true }),
    client.from("festivals").select("id, name").order("name", { ascending: true }),
  ]);

  if (prodError || !product) {
    notFound();
  }

  const initialData = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    category_id: product.category_id,
    audience: product.audience as "men" | "women" | "kids" | "unisex",
    price_paise: product.price_paise,
    compare_at_paise: product.compare_at_paise,
    badge: product.badge,
    is_active: product.is_active,
    variants: (variants || []).map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      stock: v.stock,
      sku: v.sku,
    })),
    images: (images || []).map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      sort_order: img.sort_order,
      is_primary: img.is_primary,
    })),
    festival_ids: (prodFestivals || []).map((pf) => pf.festival_id),
  };

  return (
    <div>
      <ProductForm
        initialData={initialData}
        categories={categories || []}
        festivals={festivals || []}
      />
    </div>
  );
}
