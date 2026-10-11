"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminImage as Image } from "./admin-image";
import Link from "next/link";
import { saveProduct, uploadAdminImage } from "@/app/admin/actions";
import type { AdminProductInput } from "@/lib/admin/validation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Star,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
}

interface FestivalOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    category_id: string | null;
    audience: "men" | "women" | "kids" | "unisex";
    price_paise: number;
    compare_at_paise: number | null;
    badge: string | null;
    is_active: boolean;
    variants: Array<{
      id?: string;
      size: string;
      color: string;
      stock: number;
      sku?: string | null;
    }>;
    images: Array<{
      id?: string;
      url: string;
      alt?: string | null;
      sort_order: number;
      is_primary: boolean;
    }>;
    festival_ids: string[];
  };
  categories: CategoryOption[];
  festivals: FestivalOption[];
}

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

export function ProductForm({ initialData, categories, festivals }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Basic Details State
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [autoSlug, setAutoSlug] = useState(!initialData);
  const [description, setDescription] = useState(initialData?.description || "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
  const [audience, setAudience] = useState<"men" | "women" | "kids" | "unisex">(
    initialData?.audience || "unisex"
  );
  const [priceRupees, setPriceRupees] = useState<string>(
    initialData ? (initialData.price_paise / 100).toString() : ""
  );
  const [compareAtRupees, setCompareAtRupees] = useState<string>(
    initialData?.compare_at_paise ? (initialData.compare_at_paise / 100).toString() : ""
  );
  const [badge, setBadge] = useState(initialData?.badge || "");
  const [isActive, setIsActive] = useState(initialData ? initialData.is_active : true);

  // Variants State
  const [variants, setVariants] = useState<
    Array<{
      id?: string;
      size: string;
      color: string;
      stock: number;
      sku?: string;
    }>
  >(
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: v.stock,
          sku: v.sku || "",
        }))
      : [
          { size: "S", color: "Standard", stock: 0, sku: "" },
          { size: "M", color: "Standard", stock: 0, sku: "" },
          { size: "L", color: "Standard", stock: 0, sku: "" },
          { size: "XL", color: "Standard", stock: 0, sku: "" },
        ]
  );

  // Images State
  const [images, setImages] = useState<
    Array<{
      id?: string;
      url: string;
      alt?: string;
      sort_order: number;
      is_primary: boolean;
    }>
  >(
    initialData?.images && initialData.images.length > 0
      ? initialData.images.map((img, idx) => ({
          id: img.id,
          url: img.url,
          alt: img.alt || "",
          sort_order: idx,
          is_primary: img.is_primary ?? idx === 0,
        }))
      : []
  );

  // Festivals State
  const [selectedFestivalIds, setSelectedFestivalIds] = useState<string[]>(
    initialData?.festival_ids || []
  );

  // Status & Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Slug generator helper
  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug) {
      setSlug(generateSlug(val));
    }
  };

  // Variant operations
  const addVariantRow = () => {
    setVariants((prev) => [...prev, { size: "M", color: "Standard", stock: 0, sku: "" }]);
  };

  const removeVariantRow = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateVariant = (
    index: number,
    field: "size" | "color" | "stock" | "sku",
    value: string | number
  ) => {
    setVariants((prev) =>
      prev.map((v, idx) => {
        if (idx !== index) return v;
        return {
          ...v,
          [field]: field === "stock" ? Number(value) || 0 : value,
        };
      })
    );
  };

  const addPresetSizes = (size: string) => {
    if (variants.some((v) => v.size.toLowerCase() === size.toLowerCase())) return;
    setVariants((prev) => [...prev, { size, color: "Standard", stock: 0, sku: "" }]);
  };

  // Image operations
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
      const isFirst = images.length === 0;
      setImages((prev) => [
        ...prev,
        {
          url: res.url!,
          alt: title || "Product image",
          sort_order: prev.length,
          is_primary: isFirst,
        },
      ]);
    }
    // Reset file input
    e.target.value = "";
  };

  const handleAddCustomImageUrl = () => {
    if (!customImageUrl.trim()) return;
    const isFirst = images.length === 0;
    setImages((prev) => [
      ...prev,
      {
        url: customImageUrl.trim(),
        alt: title || "Product image",
        sort_order: prev.length,
        is_primary: isFirst,
      },
    ]);
    setCustomImageUrl("");
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      // Ensure at least one image is primary if any exist
      if (filtered.length > 0 && !filtered.some((img) => img.is_primary)) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        is_primary: idx === index,
      }))
    );
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    setImages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((img, i) => ({ ...img, sort_order: i }));
    });
  };

  // Festival selection
  const toggleFestival = (festId: string) => {
    setSelectedFestivalIds((prev) =>
      prev.includes(festId) ? prev.filter((id) => id !== festId) : [...prev, festId]
    );
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const parsedPrice = parseFloat(priceRupees);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage("Please enter a valid price in rupees.");
      return;
    }

    const parsedCompareAt = compareAtRupees ? parseFloat(compareAtRupees) : null;
    if (parsedCompareAt !== null && (isNaN(parsedCompareAt) || parsedCompareAt < 0)) {
      setErrorMessage("Please enter a valid compare-at price or leave it empty.");
      return;
    }

    if (variants.length === 0) {
      setErrorMessage("At least one variant (size & color) is required.");
      return;
    }

    const payload: AdminProductInput = {
      id: initialData?.id,
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      category_id: categoryId || null,
      audience,
      price_rupees: parsedPrice,
      compare_at_rupees: parsedCompareAt,
      badge: badge.trim() || null,
      is_active: isActive,
      variants: variants.map((v) => ({
        id: v.id,
        size: v.size.trim(),
        color: v.color.trim(),
        stock: Number(v.stock),
        sku: v.sku?.trim() || null,
      })),
      images: images.map((img, idx) => ({
        id: img.id,
        url: img.url,
        alt: img.alt?.trim() || null,
        sort_order: idx,
        is_primary: img.is_primary,
      })),
      festival_ids: selectedFestivalIds,
    };

    startTransition(async () => {
      const res = await saveProduct(payload);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(res.message || "Product saved successfully!");
        setTimeout(() => {
          router.push("/admin/products");
          router.refresh();
        }, 800);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-full border border-stone-300 hover:bg-stone-100 text-stone-600 transition-colors"
            title="Back to products list"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#2B2625] font-serif">
              {initialData ? `Edit Product: ${initialData.title}` : "Create New Product"}
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">
              Fill in product details, sizing variants, media assets, and festival tags.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="px-5 py-2.5 text-sm font-semibold rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || isUploading}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full bg-[#A74224] text-white hover:bg-[#8D371E] disabled:opacity-50 transition-colors shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Product...</span>
              </>
            ) : (
              <span>{initialData ? "Save Changes" : "Create Product"}</span>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold">Unable to save product</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-semibold">{successMessage}</p>
            <p className="mt-0.5 text-xs text-emerald-700">Redirecting to product catalogue...</p>
          </div>
        </div>
      )}

      {/* Section 1: Basic Information */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[#2B2625] flex items-center gap-2">
          <span>General Information</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="md:col-span-2">
            <label htmlFor="product-title" className="block text-sm font-semibold text-stone-800 mb-1.5">
              Product Title <span className="text-[#A74224]">*</span>
            </label>
            <input
              id="product-title"
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Royal Silk Festive Kurta"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm text-stone-900 outline-none"
            />
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="product-slug" className="text-sm font-semibold text-stone-800">
                URL Slug <span className="text-[#A74224]">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setAutoSlug(false);
                  setSlug(generateSlug(title));
                }}
                className="text-xs text-[#A74224] hover:underline"
              >
                Regenerate from Title
              </button>
            </div>
            <input
              id="product-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="royal-silk-festive-kurta"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm font-mono text-stone-900 outline-none"
            />
            <p className="text-xs text-stone-400 mt-1">Lowercase letters, numbers, and hyphens only.</p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="product-category" className="block text-sm font-semibold text-stone-800 mb-1.5">
              Category
            </label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm text-stone-900 outline-none bg-white"
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Audience */}
          <div>
            <label htmlFor="product-audience" className="block text-sm font-semibold text-stone-800 mb-1.5">
              Target Audience
            </label>
            <select
              id="product-audience"
              value={audience}
              onChange={(e) =>
                setAudience(e.target.value as "men" | "women" | "kids" | "unisex")
              }
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm text-stone-900 outline-none bg-white"
            >
              <option value="unisex">Unisex</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
            </select>
          </div>

          {/* Badge / Tag */}
          <div>
            <label htmlFor="product-badge" className="block text-sm font-semibold text-stone-800 mb-1.5">
              Merchandising Badge
            </label>
            <input
              id="product-badge"
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="e.g. Trending, Best Seller, Festive Pick"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm text-stone-900 outline-none"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="product-description" className="block text-sm font-semibold text-stone-800 mb-1.5">
              Description
            </label>
            <textarea
              id="product-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed product story, craftsmanship, fabric specifications, and fit guide..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm text-stone-900 outline-none"
            />
          </div>

          {/* Active Status */}
          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <input
              id="product-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 text-[#A74224] rounded border-stone-300 focus:ring-[#A74224]"
            />
            <label htmlFor="product-active" className="text-sm font-medium text-stone-800 cursor-pointer">
              Active in Storefront (Published & visible to customers)
            </label>
          </div>
        </div>
      </div>

      {/* Section 2: Pricing */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[#2B2625]">Pricing (INR ₹)</h2>
        <p className="text-xs text-stone-500 -mt-4">
          All prices are entered in Rupees (₹) and automatically converted to integer paise in the database.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="product-price" className="block text-sm font-semibold text-stone-800 mb-1.5">
              Selling Price (₹) <span className="text-[#A74224]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-stone-400 font-semibold text-sm">₹</span>
              <input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                placeholder="1499.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm text-stone-900 outline-none font-mono"
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Paise stored: {Math.round((parseFloat(priceRupees) || 0) * 100)} paise
            </p>
          </div>

          <div>
            <label htmlFor="product-compare-at" className="block text-sm font-semibold text-stone-800 mb-1.5">
              Compare-At / MRP Price (₹) <span className="text-xs text-stone-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-stone-400 font-semibold text-sm">₹</span>
              <input
                id="product-compare-at"
                type="number"
                step="0.01"
                min="0"
                value={compareAtRupees}
                onChange={(e) => setCompareAtRupees(e.target.value)}
                placeholder="2499.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-300 focus:border-[#A74224] focus:ring-1 focus:ring-[#A74224] text-sm text-stone-900 outline-none font-mono"
              />
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Used to display strike-through discount price in storefront.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Variants (Size & Color & Inventory) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#2B2625]">Inventory & Variants</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Specify sizes, colors, and stock levels. Every product must have at least one variant.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariantRow}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <Plus size={14} />
            <span>Add Variant Row</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100">
          <span className="text-xs text-stone-500 font-medium">Quick add size:</span>
          {COMMON_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => addPresetSizes(size)}
              className="px-2.5 py-1 text-xs rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono transition-colors"
            >
              + {size}
            </button>
          ))}
        </div>

        {/* Variants Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-semibold bg-stone-50">
                <th className="py-3 px-3">Size *</th>
                <th className="py-3 px-3">Color *</th>
                <th className="py-3 px-3">Stock Units *</th>
                <th className="py-3 px-3">SKU (Optional)</th>
                <th className="py-3 px-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {variants.map((v, index) => (
                <tr key={index} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      required
                      value={v.size}
                      onChange={(e) => updateVariant(index, "size", e.target.value)}
                      placeholder="e.g. M"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-semibold uppercase"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      required
                      value={v.color}
                      onChange={(e) => updateVariant(index, "color", e.target.value)}
                      placeholder="e.g. Standard"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="0"
                      required
                      value={v.stock}
                      onChange={(e) => updateVariant(index, "stock", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={v.sku || ""}
                      onChange={(e) => updateVariant(index, "sku", e.target.value)}
                      placeholder="e.g. TL-KRT-01"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-mono uppercase text-stone-600"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      disabled={variants.length <= 1}
                      onClick={() => removeVariantRow(index)}
                      className="p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-20 transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Product Images */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#2B2625]">Product Media & Photos</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Upload images to Supabase Storage (product-images bucket) or enter a path from the project product-images bucket. First image or selected primary image is featured on catalogue cards.
          </p>
        </div>

        {/* Upload Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Upload Image File (JPG, PNG, WebP &lt; 5MB)
            </label>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-stone-400 hover:border-[#A74224] bg-white cursor-pointer text-sm font-medium text-stone-700 transition-colors">
              <Upload size={16} className="text-[#A74224]" />
              <span>{isUploading ? "Uploading to bucket..." : "Choose Image to Upload"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label htmlFor="custom-image-url" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Or Add by URL
            </label>
            <div className="flex gap-2">
              <input
                id="custom-image-url"
                type="text"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 font-mono outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomImageUrl}
                className="px-4 py-2 bg-stone-800 text-white rounded-xl text-xs font-medium hover:bg-stone-900 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Images List */}
        {images.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6 border border-dashed border-stone-200 rounded-xl">
            No images uploaded yet. You can upload an image add approved product photography.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div
                key={index}
                className={`relative rounded-xl border overflow-hidden p-2 flex flex-col justify-between bg-stone-50 ${
                  img.is_primary ? "border-[#A74224] ring-2 ring-[#A74224]/20" : "border-stone-200"
                }`}
              >
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-stone-200 mb-2">
                  <Image
                    src={img.url}
                    alt={img.alt || "Product image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {img.is_primary && (
                    <span className="absolute top-2 left-2 bg-[#A74224] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Star size={10} className="fill-white" />
                      Primary
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={img.alt || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImages((prev) =>
                        prev.map((item, idx) => (idx === index ? { ...item, alt: val } : item))
                      );
                    }}
                    placeholder="Alt description"
                    className="w-full px-2 py-1 text-xs rounded border border-stone-200 text-stone-700"
                  />

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(index)}
                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                        img.is_primary
                          ? "text-[#A74224]"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      <Star size={12} className={img.is_primary ? "fill-[#A74224]" : ""} />
                      {img.is_primary ? "Primary" : "Set Primary"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveImage(index, "up")}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                        title="Move left/up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === images.length - 1}
                        onClick={() => moveImage(index, "down")}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20"
                        title="Move right/down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-1 text-stone-400 hover:text-red-600 ml-1"
                        title="Delete image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Festival Associations */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#2B2625]">Indian Festival Tagging</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Select the cultural festivals this garment is curated for (Diwali, Navratri, Durga Puja, Eid, etc.).
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          {festivals.map((fest) => {
            const isSelected = selectedFestivalIds.includes(fest.id);
            return (
              <button
                key={fest.id}
                type="button"
                onClick={() => toggleFestival(fest.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#A74224] text-white shadow-sm ring-2 ring-[#A74224]/30"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200"
                }`}
              >
                <span>{fest.name}</span>
                {isSelected && <span>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-stone-200">
        <Link
          href="/admin/products"
          className="px-6 py-2.5 text-sm font-semibold rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || isUploading}
          className="inline-flex items-center gap-2 px-8 py-2.5 text-sm font-semibold rounded-full bg-[#A74224] text-white hover:bg-[#8D371E] disabled:opacity-50 transition-colors shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving Product...</span>
            </>
          ) : (
            <span>{initialData ? "Save Changes" : "Create Product"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
