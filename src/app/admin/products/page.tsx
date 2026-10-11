import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductTable, type AdminProductRow } from "@/features/admin/components/product-table";
import { Plus, Search, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const selectedCategory = params.category || "";
  const selectedStatus = params.status || "all";

  const client = await createServerSupabaseClient();

  let productsList: AdminProductRow[] = [];
  let categoriesList: Array<{ id: string; name: string }> = [];

  if (client) {
    // 1. Fetch categories for filter dropdown
    const { data: cats } = await client
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    categoriesList = cats || [];

    // 2. Build products query
    let query = client
      .from("products")
      .select(`
        id,
        title,
        slug,
        audience,
        price_paise,
        compare_at_paise,
        badge,
        is_active,
        created_at,
        category:categories(name),
        variants:product_variants(stock),
        images:product_images(url, is_primary, sort_order)
      `)
      .order("created_at", { ascending: false });

    if (q) {
      query = query.ilike("title", `%${q}%`);
    }

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }

    if (selectedStatus === "active") {
      query = query.eq("is_active", true);
    } else if (selectedStatus === "draft") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query;

    if (!error && data) {
      type ProductQueryResult = {
        id: string;
        title: string;
        slug: string;
        audience: string;
        price_paise: number;
        compare_at_paise: number | null;
        badge: string | null;
        is_active: boolean;
        created_at: string;
        category: { name: string | null } | null;
        variants: Array<{ stock?: number }> | null;
        images: Array<{ url: string; is_primary: boolean; sort_order: number }> | null;
      };

      productsList = (data as unknown as ProductQueryResult[]).map((item) => {
        // Compute total stock across variants
        const totalStock = Array.isArray(item.variants)
          ? item.variants.reduce((acc: number, v: { stock?: number }) => acc + (v.stock || 0), 0)
          : 0;

        // Find primary thumbnail
        let thumbUrl: string | null = null;
        if (Array.isArray(item.images) && item.images.length > 0) {
          const primary = item.images.find((img) => img.is_primary);
          thumbUrl = primary?.url || item.images[0]?.url || null;
        }

        const categoryName = item.category?.name || null;

        return {
          id: item.id,
          title: item.title,
          slug: item.slug,
          category_name: categoryName,
          audience: item.audience,
          price_paise: item.price_paise,
          compare_at_paise: item.compare_at_paise,
          badge: item.badge,
          is_active: item.is_active,
          total_stock: totalStock,
          thumbnail_url: thumbUrl,
          created_at: item.created_at,
        };
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#2B2625] font-serif">Product Catalogue</h1>
            <span className="bg-[#A74224]/10 text-[#A74224] text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
              {productsList.length} items
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Manage your apparel catalog, stock counts, pricing, and visual media assets.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#A74224] text-white text-sm font-semibold hover:bg-[#8D371E] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
        <form method="get" className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search garments by title..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-stone-400 shrink-0 hidden sm:block" />
            <select
              name="category"
              defaultValue={selectedCategory}
              className="w-full sm:w-auto px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none bg-white text-stone-800"
            >
              <option value="">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            name="status"
            defaultValue={selectedStatus}
            className="w-full sm:w-auto px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none bg-white text-stone-800"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="draft">Drafts Only</option>
          </select>

          {/* Submit Button */}
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Filter
          </button>

          {(q || selectedCategory || selectedStatus !== "all") && (
            <Link
              href="/admin/products"
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors text-center"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Product Table */}
      <ProductTable products={productsList} />
    </div>
  );
}
