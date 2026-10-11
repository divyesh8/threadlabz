import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CategoryManager, type CategoryItem } from "@/features/admin/components/category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const client = await createServerSupabaseClient();

  let categoriesList: CategoryItem[] = [];

  if (client) {
    const { data, error } = await client
      .from("categories")
      .select(`
        id,
        name,
        slug,
        image_url,
        sort_order,
        is_active,
        products:products(id)
      `)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data) {
      type CategoryQueryRow = {
        id: string;
        name: string;
        slug: string;
        image_url: string | null;
        sort_order: number;
        is_active: boolean;
        products: Array<{ id: string }> | null;
      };

      categoriesList = (data as unknown as CategoryQueryRow[]).map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        image_url: item.image_url,
        sort_order: item.sort_order,
        is_active: item.is_active,
        product_count: Array.isArray(item.products) ? item.products.length : 0,
      }));
    }
  }

  return <CategoryManager initialCategories={categoriesList} />;
}
