"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  saveBanner,
  toggleBannerActive,
  deleteBanner,
  uploadAdminImage,
} from "@/app/admin/actions";
import type { AdminBannerInput } from "@/lib/admin/validation";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Upload,
  Loader2,
  Image as ImageIcon,
  X,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export interface BannerItem {
  id: string;
  placement: "hero" | "festive";
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface BannerManagerProps {
  initialBanners: BannerItem[];
}

export function BannerManager({ initialBanners }: BannerManagerProps) {
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);

  // Form State
  const [placement, setPlacement] = useState<"hero" | "festive">("hero");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Status & Upload
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const openCreateModal = () => {
    setEditingBanner(null);
    setPlacement("hero");
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setCtaLabel("Shop Now");
    setCtaHref("/shop");
    setSortOrder(banners.length);
    setIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: BannerItem) => {
    setEditingBanner(b);
    setPlacement(b.placement);
    setTitle(b.title);
    setSubtitle(b.subtitle || "");
    setImageUrl(b.image_url || "");
    setCtaLabel(b.cta_label || "");
    setCtaHref(b.cta_href || "");
    setSortOrder(b.sort_order);
    setIsActive(b.is_active);
    setErrorMessage(null);
    setIsModalOpen(true);
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

    const payload: AdminBannerInput = {
      id: editingBanner?.id,
      placement,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      image_url: imageUrl.trim() || null,
      cta_label: ctaLabel.trim() || null,
      cta_href: ctaHref.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    startTransition(async () => {
      const res = await saveBanner(payload);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Banner saved successfully.",
        });
        setIsModalOpen(false);

        if (editingBanner) {
          setBanners((prev) =>
            prev.map((item) =>
              item.id === editingBanner.id
                ? {
                    ...item,
                    placement: payload.placement,
                    title: payload.title,
                    subtitle: payload.subtitle || null,
                    image_url: payload.image_url || null,
                    cta_label: payload.cta_label || null,
                    cta_href: payload.cta_href || null,
                    sort_order: payload.sort_order,
                    is_active: payload.is_active,
                  }
                : item
            )
          );
        } else {
          window.location.reload();
        }
      }
    });
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    setActionId(id);
    startTransition(async () => {
      const res = await toggleBannerActive(id, currentStatus);
      if (res.success) {
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, is_active: !currentStatus } : b))
        );
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to toggle status" });
      }
      setActionId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional banner?")) {
      return;
    }

    setActionId(id);
    startTransition(async () => {
      const res = await deleteBanner(id);
      if (res.success) {
        setFeedbackMessage({ type: "success", text: res.message || "Banner deleted." });
        setBanners((prev) => prev.filter((b) => b.id !== id));
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to delete banner" });
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
            <h1 className="text-2xl font-bold text-[#2B2625] font-serif">Storefront Banners</h1>
            <span className="bg-[#A74224]/10 text-[#A74224] text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
              {banners.length} promotional banners
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Curate hero editorial slides and festive promotional banners on the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#A74224] text-white text-sm font-semibold hover:bg-[#8D371E] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Banner</span>
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

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-semibold bg-stone-50/75">
                <th className="py-3.5 px-4">Banner Preview</th>
                <th className="py-3.5 px-4">Placement</th>
                <th className="py-3.5 px-4">Call To Action</th>
                <th className="py-3.5 px-4">Sort Order</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {banners.map((b) => {
                const isWorking = isPending && actionId === b.id;
                return (
                  <tr key={b.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Preview Image & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-24 h-14 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                          {b.image_url ? (
                            <Image
                              src={b.image_url}
                              alt={b.title}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-stone-400">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-semibold text-stone-900 truncate">{b.title}</p>
                          {b.subtitle && (
                            <p className="text-xs text-stone-500 truncate mt-0.5">{b.subtitle}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Placement */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          b.placement === "hero"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {b.placement}
                      </span>
                    </td>

                    {/* CTA */}
                    <td className="py-3.5 px-4">
                      {b.cta_label ? (
                        <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                          <span className="font-semibold text-stone-900">{b.cta_label}</span>
                          <span className="text-stone-400 font-mono">({b.cta_href || "/"})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400 italic">No CTA</span>
                      )}
                    </td>

                    {/* Sort Order */}
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-600">
                      {b.sort_order}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleToggle(b.id, b.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          b.is_active
                            ? "bg-stone-900 text-white hover:bg-stone-700"
                            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                        }`}
                      >
                        {isWorking ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : b.is_active ? (
                          <CheckCircle size={12} className="text-emerald-400" />
                        ) : (
                          <XCircle size={12} className="text-stone-400" />
                        )}
                        <span>{b.is_active ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.cta_href && (
                          <a
                            href={b.cta_href}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            title="Test destination URL"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-[#A74224] hover:bg-stone-100 transition-colors"
                          title="Edit banner"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete banner"
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

      {/* Mobile Card List (< 768px) */}
      <div className="md:hidden space-y-3">
        {banners.map((b) => {
          const isWorking = isPending && actionId === b.id;
          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3"
            >
              <div className="relative aspect-21/9 w-full rounded-xl bg-stone-100 border border-stone-200 overflow-hidden">
                {b.image_url ? (
                  <Image
                    src={b.image_url}
                    alt={b.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-stone-400">
                    <ImageIcon size={24} />
                  </div>
                )}
                <span
                  className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    b.placement === "hero"
                      ? "bg-purple-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {b.placement}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-sm">{b.title}</h3>
                {b.subtitle && <p className="text-xs text-stone-500 mt-0.5">{b.subtitle}</p>}
                {b.cta_label && (
                  <p className="text-xs text-stone-600 mt-1 font-medium">
                    CTA: {b.cta_label} → <span className="font-mono text-stone-400">{b.cta_href}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => handleToggle(b.id, b.is_active)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    b.is_active ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {b.is_active ? "Active" : "Inactive"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(b)}
                    className="px-3 py-1 rounded-lg border border-stone-200 text-xs font-semibold text-[#A74224]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => handleDelete(b.id)}
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h3 className="text-lg font-bold text-stone-900">
                {editingBanner ? `Edit Banner: ${editingBanner.title}` : "Create Promotional Banner"}
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
              {/* Placement */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Placement Section *
                </label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as "hero" | "festive")}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none bg-white"
                >
                  <option value="hero">Hero Carousel (Homepage Top)</option>
                  <option value="festive">Festive Highlight (Midpage Banner)</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Banner Headline *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. FESTIVE COLLECTION 2026"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Subtitle / Promo Text
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Handcrafted silks and royal kurtas for Diwali & Navratri"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                />
              </div>

              {/* Image Upload or URL */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Banner Artwork Image
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-stone-400 hover:border-[#A74224] bg-stone-50 cursor-pointer text-xs font-medium text-stone-700 transition-colors">
                    <Upload size={14} className="text-[#A74224]" />
                    <span>{isUploading ? "Uploading..." : "Upload Artwork"}</span>
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

              {/* CTA Label & Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Shop Collection"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    CTA Destination URL
                  </label>
                  <input
                    type="text"
                    value={ctaHref}
                    onChange={(e) => setCtaHref(e.target.value)}
                    placeholder="/shop/festive"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                  />
                </div>
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
                    id="banner-active-check"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 text-[#A74224] rounded border-stone-300"
                  />
                  <label htmlFor="banner-active-check" className="text-xs font-semibold text-stone-800 cursor-pointer">
                    Active & Displaying
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
                    <span>Save Banner</span>
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
