"use client";

import { useState, useTransition } from "react";
import { AdminImage as Image } from "./admin-image";
import {
  saveCategory,
  toggleCategoryActive,
  deleteCategory,
  uploadAdminImage,
} from "@/app/admin/actions";
import type { AdminCategoryInput } from "@/lib/admin/validation";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Upload,
  Loader2,
  Layers,
  X,
  AlertCircle,
} from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

interface CategoryManagerProps {
  initialCategories: CategoryItem[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Status & Upload
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setImageUrl("");
    setSortOrder(categories.length);
    setIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setImageUrl(cat.image_url || "");
    setSortOrder(cat.sort_order);
    setIsActive(cat.is_active);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(generateSlug(val));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await uploadAdminImage(formData);
    setIsUploading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.url) {
      setImageUrl(res.url);
    }
    e.target.value = "";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: AdminCategoryInput = {
      id: editingCategory?.id,
      name: name.trim(),
      slug: slug.trim(),
      image_url: imageUrl.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    startTransition(async () => {
      const res = await saveCategory(payload);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Category saved successfully.",
        });
        setIsModalOpen(false);

        // Optimistically update list
        if (editingCategory) {
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id
                ? {
                    ...c,
                    name: payload.name,
                    slug: payload.slug,
                    image_url: payload.image_url || null,
                    sort_order: payload.sort_order,
                    is_active: payload.is_active,
                  }
                : c
            )
          );
        } else {
          // Re-sort after reload or add
          window.location.reload();
        }
      }
    });
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    setActionId(id);
    startTransition(async () => {
      const res = await toggleCategoryActive(id, currentStatus);
      if (res.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
        );
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to toggle status" });
      }
      setActionId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this category? If products belong to it, it will be safely deactivated.")) {
      return;
    }

    setActionId(id);
    startTransition(async () => {
      const res = await deleteCategory(id);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Category removed or deactivated.",
        });
        // If it was deactivated vs deleted, check message
        if (res.message?.includes("deactivated")) {
          setCategories((prev) =>
            prev.map((c) => (c.id === id ? { ...c, is_active: false } : c))
          );
        } else {
          setCategories((prev) => prev.filter((c) => c.id !== id));
        }
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to delete category" });
      }
      setActionId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#2B2625] font-serif">Category Management</h1>
            <span className="bg-[#A74224]/10 text-[#A74224] text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
              {categories.length} departments
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Organize departments, festival wear collections, and navigation categories.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#A74224] text-white text-sm font-semibold hover:bg-[#8D371E] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
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

      {/* Categories Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-semibold bg-stone-50/75">
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Slug</th>
                <th className="py-3.5 px-4">Products</th>
                <th className="py-3.5 px-4">Sort Order</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {categories.map((cat) => {
                const isWorking = isPending && actionId === cat.id;
                return (
                  <tr key={cat.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Image & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                          {cat.image_url ? (
                            <Image
                              src={cat.image_url}
                              alt={cat.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-stone-400">
                              <Layers size={20} />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-stone-900">{cat.name}</span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-500">
                      /{cat.slug}
                    </td>

                    {/* Products Count */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                        {cat.product_count} products
                      </span>
                    </td>

                    {/* Sort Order */}
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-600">
                      {cat.sort_order}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleToggle(cat.id, cat.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          cat.is_active
                            ? "bg-stone-900 text-white hover:bg-stone-700"
                            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                        }`}
                      >
                        {isWorking ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : cat.is_active ? (
                          <CheckCircle size={12} className="text-emerald-400" />
                        ) : (
                          <XCircle size={12} className="text-stone-400" />
                        )}
                        <span>{cat.is_active ? "Active" : "Hidden"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-[#A74224] hover:bg-stone-100 transition-colors"
                          title="Edit category"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete category"
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

      {/* Mobile Cards (< 768px) */}
      <div className="md:hidden space-y-3">
        {categories.map((cat) => {
          const isWorking = isPending && actionId === cat.id;
          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative size-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-stone-400">
                      <Layers size={22} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-stone-900 text-sm truncate">{cat.name}</h3>
                  <p className="text-xs text-stone-400 font-mono truncate">/{cat.slug}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {cat.product_count} products • Order: {cat.sort_order}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => handleToggle(cat.id, cat.is_active)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    cat.is_active ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {cat.is_active ? "Active" : "Hidden"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="px-3 py-1 rounded-lg border border-stone-200 text-xs font-semibold text-[#A74224]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => handleDelete(cat.id)}
                    className="px-3 py-1 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h3 className="text-lg font-bold text-stone-900">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Festive Wear"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Slug (URL Key) *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="festive-wear"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                />
              </div>

              {/* Image Upload or URL */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Category Image
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-stone-400 hover:border-[#A74224] bg-stone-50 cursor-pointer text-xs font-medium text-stone-700 transition-colors">
                    <Upload size={14} className="text-[#A74224]" />
                    <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      disabled={isUploading}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-stone-400">or enter image URL below</span>
                </div>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                />
              </div>

              {/* Sort Order & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="cat-active-check"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 text-[#A74224] rounded border-stone-300"
                  />
                  <label htmlFor="cat-active-check" className="text-xs font-semibold text-stone-800 cursor-pointer">
                    Active & Published
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="px-6 py-2 text-xs font-semibold rounded-full bg-[#A74224] text-white hover:bg-[#8D371E] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Category</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
