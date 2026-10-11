import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import {
  Package,
  CheckCircle,
  Layers,
  ShoppingBag,
  Mail,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const client = await createServerSupabaseClient();

  let totalProducts = 0;
  let activeProducts = 0;
  let totalCategories = 0;
  let totalOrders = 0;
  let totalSubscribers = 0;
  let recentProducts: Array<{
    id: string;
    title: string;
    slug: string;
    price_paise: number;
    is_active: boolean;
    created_at: string;
  }> = [];

  if (client) {
    const [
      { count: pTotal },
      { count: pActive },
      { count: catCount },
      { count: orderCount },
      { count: subCount },
      { data: recent },
    ] = await Promise.all([
      client.from("products").select("id", { count: "exact", head: true }),
      client.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      client.from("categories").select("id", { count: "exact", head: true }),
      client.from("orders").select("id", { count: "exact", head: true }),
      client.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      client
        .from("products")
        .select("id, title, slug, price_paise, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    totalProducts = pTotal ?? 0;
    activeProducts = pActive ?? 0;
    totalCategories = catCount ?? 0;
    totalOrders = orderCount ?? 0;
    totalSubscribers = subCount ?? 0;
    recentProducts = recent ?? [];
  }

  const statCards = [
    {
      title: "Total Products",
      value: totalProducts,
      subtitle: `${activeProducts} active in store`,
      icon: Package,
      href: "/admin/products",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      title: "Active Products",
      value: activeProducts,
      subtitle: `${totalProducts - activeProducts} drafts / inactive`,
      icon: CheckCircle,
      href: "/admin/products",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: "Categories",
      value: totalCategories,
      subtitle: "Departments & Collections",
      icon: Layers,
      href: "/admin/categories",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      title: "Total Orders",
      value: totalOrders,
      subtitle: totalOrders === 0 ? "No customer orders yet" : "Customer orders",
      icon: ShoppingBag,
      href: "#",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      title: "Newsletter Subscribers",
      value: totalSubscribers,
      subtitle: "Subscribers registered",
      icon: Mail,
      href: "#",
      color: "bg-stone-50 text-stone-700 border-stone-200",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-[#A74224] font-semibold">
            Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2B2625] font-serif">
            Store Dashboard
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Real-time catalog metrics and store management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 bg-[#A74224] hover:bg-[#8e381e] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold font-serif text-[#2B2625]">{card.value}</div>
                <p className="text-xs text-stone-500 mt-1">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/products"
          className="group p-5 bg-white rounded-xl border border-stone-200 hover:border-[#A74224] shadow-sm hover:shadow transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2.5 bg-stone-100 rounded-lg text-stone-800 group-hover:bg-[#A74224] group-hover:text-white transition-colors">
                <Package size={20} />
              </span>
              <ArrowRight size={16} className="text-stone-400 group-hover:text-[#A74224] group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-base font-semibold text-[#2B2625]">Product Management</h2>
            <p className="text-xs text-stone-500 mt-1">
              Create, edit, manage stock variants, photos and festival links.
            </p>
          </div>
          <span className="text-xs font-medium text-[#A74224] mt-4 font-mono">
            {totalProducts} products &rarr;
          </span>
        </Link>

        <Link
          href="/admin/categories"
          className="group p-5 bg-white rounded-xl border border-stone-200 hover:border-[#A74224] shadow-sm hover:shadow transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2.5 bg-stone-100 rounded-lg text-stone-800 group-hover:bg-[#A74224] group-hover:text-white transition-colors">
                <Layers size={20} />
              </span>
              <ArrowRight size={16} className="text-stone-400 group-hover:text-[#A74224] group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-base font-semibold text-[#2B2625]">Category Management</h2>
            <p className="text-xs text-stone-500 mt-1">
              Departments (Men, Women, Kids, Costumes, Accessories) & display order.
            </p>
          </div>
          <span className="text-xs font-medium text-[#A74224] mt-4 font-mono">
            {totalCategories} categories &rarr;
          </span>
        </Link>

        <Link
          href="/admin/festivals"
          className="group p-5 bg-white rounded-xl border border-stone-200 hover:border-[#A74224] shadow-sm hover:shadow transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-2.5 bg-stone-100 rounded-lg text-stone-800 group-hover:bg-[#A74224] group-hover:text-white transition-colors">
                <Sparkles size={20} />
              </span>
              <ArrowRight size={16} className="text-stone-400 group-hover:text-[#A74224] group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-base font-semibold text-[#2B2625]">Festival Management</h2>
            <p className="text-xs text-stone-500 mt-1">
              20 Indian festivals curation, calendar dates, and catalog associations.
            </p>
          </div>
          <span className="text-xs font-medium text-[#A74224] mt-4 font-mono">
            Festivals collection &rarr;
          </span>
        </Link>
      </div>

      {/* Recent Products Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#A74224]" />
            <h2 className="font-semibold text-[#2B2625] text-base">Recently Added Products</h2>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-medium text-[#A74224] hover:underline"
          >
            View all products &rarr;
          </Link>
        </div>

        {recentProducts.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            No products in database yet. Click &ldquo;Add Product&rdquo; to create your first item.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs text-stone-600 uppercase font-mono border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#2B2625]">
                      <div>{p.title}</div>
                      <div className="text-xs text-stone-400 font-mono">{p.slug}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-stone-700">
                      {formatPrice(p.price_paise)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-xs font-medium text-[#A74224] hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
