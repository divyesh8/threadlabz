"use client";

import { useState, useTransition } from "react";
import { AdminImage as Image } from "@/features/media/components/admin-image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { toggleProductActive, deleteOrDeactivateProduct } from "@/features/admin/actions/catalogue";
import {
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Package,
  Eye,
} from "lucide-react";

export interface AdminProductRow {
  id: string;
  title: string;
  slug: string;
  category_name: string | null;
  audience: string;
  price_paise: number;
  compare_at_paise: number | null;
  badge: string | null;
  is_active: boolean;
  total_stock: number;
  thumbnail_url: string | null;
  created_at: string;
}

interface ProductTableProps {
  products: AdminProductRow[];
}

export function ProductTable({ products: initialProducts }: ProductTableProps) {
  const [products, setProducts] = useState<AdminProductRow[]>(initialProducts);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal State for Delete Confirmation
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<AdminProductRow | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleToggle = (id: string, currentStatus: boolean) => {
    setActionId(id);
    startTransition(async () => {
      const res = await toggleProductActive(id, currentStatus);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
        );
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to update product status" });
      }
      setActionId(null);
    });
  };

  const handleDelete = () => {
    if (!confirmDeleteProduct) return;
    const target = confirmDeleteProduct;
    setActionId(target.id);

    startTransition(async () => {
      const res = await deleteOrDeactivateProduct(target.id);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Product removed or deactivated successfully.",
        });
        setProducts((prev) => prev.filter((p) => p.id !== target.id));
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to delete product" });
      }
      setConfirmDeleteProduct(null);
      setActionId(null);
    });
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
        <Package size={48} className="mx-auto text-stone-300 mb-3" />
        <h3 className="text-lg font-bold text-stone-800">No products match your criteria</h3>
        <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
          Try adjusting your search terms or filters, or add a new garment to your store catalogue.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#A74224] text-white text-sm font-semibold hover:bg-[#8D371E] transition-colors"
          >
            Create Product
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl mb-4 text-sm flex items-center justify-between border ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold uppercase tracking-wider underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-semibold bg-stone-50/75">
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Total Stock</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((product) => {
                const isWorking = isPending && actionId === product.id;
                return (
                  <tr key={product.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Thumbnail & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                          {product.thumbnail_url ? (
                            <Image
                              src={product.thumbnail_url}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-stone-400">
                              <Package size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="font-semibold text-stone-900 hover:text-[#A74224] transition-colors block truncate max-w-xs"
                            title={product.title}
                          >
                            {product.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-stone-400 font-mono">
                              /{product.slug}
                            </span>
                            {product.badge && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                {product.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <div className="text-stone-700 font-medium text-xs">
                        {product.category_name || "Uncategorized"}
                      </div>
                      <span className="text-[11px] text-stone-400 capitalize">
                        {product.audience}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-900 font-mono">
                        {formatPrice(product.price_paise)}
                      </div>
                      {product.compare_at_paise && (
                        <div className="text-xs text-stone-400 line-through font-mono">
                          {formatPrice(product.compare_at_paise)}
                        </div>
                      )}
                    </td>

                    {/* Total Stock */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          product.total_stock === 0
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : product.total_stock < 10
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            product.total_stock === 0
                              ? "bg-red-500"
                              : product.total_stock < 10
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {product.total_stock} in stock
                      </span>
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleToggle(product.id, product.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          product.is_active
                            ? "bg-stone-900 text-white hover:bg-stone-700"
                            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                        }`}
                        title={product.is_active ? "Click to deactivate" : "Click to activate"}
                      >
                        {isWorking ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : product.is_active ? (
                          <CheckCircle size={12} className="text-emerald-400" />
                        ) : (
                          <XCircle size={12} className="text-stone-400" />
                        )}
                        <span>{product.is_active ? "Active" : "Draft"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                          title="Preview storefront product"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-[#A74224] hover:bg-stone-100 transition-colors"
                          title="Edit product"
                        >
                          <Edit3 size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteProduct(product)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete or deactivate"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View (< 768px) */}
      <div className="md:hidden space-y-3">
        {products.map((product) => {
          const isWorking = isPending && actionId === product.id;
          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="relative size-16 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                  {product.thumbnail_url ? (
                    <Image
                      src={product.thumbnail_url}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-stone-400">
                      <Package size={24} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-bold text-stone-900 hover:text-[#A74224] text-sm block truncate"
                  >
                    {product.title}
                  </Link>
                  <p className="text-xs text-stone-400 font-mono truncate">/{product.slug}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-stone-900 font-mono">
                      {formatPrice(product.price_paise)}
                    </span>
                    <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      {product.category_name || "Uncategorized"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Stock row */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    product.total_stock === 0
                      ? "text-red-600"
                      : product.total_stock < 10
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {product.total_stock} in stock
                </span>

                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => handleToggle(product.id, product.is_active)}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors text-xs ${
                    product.is_active
                      ? "bg-stone-900 text-white"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {product.is_active ? "Active" : "Draft"}
                </button>
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                <Link
                  href={`/products/${product.slug}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 flex items-center gap-1"
                >
                  <Eye size={14} />
                  <span>Preview</span>
                </Link>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-[#A74224] flex items-center gap-1"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteProduct(product)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Delete &ldquo;{confirmDeleteProduct.title}&rdquo;?
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                If this garment is already associated with past customer orders, it will be safely deactivated instead of erased to maintain historical tax and order records.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmDeleteProduct(null)}
                className="px-4 py-2 text-sm font-semibold rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="px-5 py-2 text-sm font-semibold rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
