import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const client = await createServerSupabaseClient();

  let categories: Array<{ id: string; name: string }> = [];
  let festivals: Array<{ id: string; name: string }> = [];

  if (client) {
    const [{ data: cats }, { data: fests }] = await Promise.all([
      client.from("categories").select("id, name").order("name", { ascending: true }),
      client.from("festivals").select("id, name").order("name", { ascending: true }),
    ]);

    categories = cats || [];
    festivals = fests || [];
  }

  return (
    <div>
      <ProductForm categories={categories} festivals={festivals} />
    </div>
  );
}
