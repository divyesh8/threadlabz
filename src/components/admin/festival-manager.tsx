"use client";

import { useState, useTransition } from "react";
import { AdminImage as Image } from "./admin-image";
import {
  saveFestival,
  toggleFestivalActive,
  deleteFestival,
  uploadAdminImage,
} from "@/app/admin/actions";
import type { AdminFestivalInput } from "@/lib/admin/validation";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Upload,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  Calendar,
} from "lucide-react";

export interface FestivalItem {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  event_date: string | null;
  sort_order: number;
  is_active: boolean;
}

interface FestivalManagerProps {
  initialFestivals: FestivalItem[];
}

export function FestivalManager({ initialFestivals }: FestivalManagerProps) {
  const [festivals, setFestivals] = useState<FestivalItem[]>(initialFestivals);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFestival, setEditingFestival] = useState<FestivalItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
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
    setEditingFestival(null);
    setName("");
    setSlug("");
    setIconUrl("");
    setEventDate("");
    setSortOrder(festivals.length);
    setIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (fest: FestivalItem) => {
    setEditingFestival(fest);
    setName(fest.name);
    setSlug(fest.slug);
    setIconUrl(fest.icon_url || "");
    setEventDate(fest.event_date || "");
    setSortOrder(fest.sort_order);
    setIsActive(fest.is_active);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingFestival) {
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
      setIconUrl(res.url);
    }
    e.target.value = "";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: AdminFestivalInput = {
      id: editingFestival?.id,
      name: name.trim(),
      slug: slug.trim(),
      icon_url: iconUrl.trim() || null,
      event_date: eventDate || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    startTransition(async () => {
      const res = await saveFestival(payload);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Festival saved successfully.",
        });
        setIsModalOpen(false);

        if (editingFestival) {
          setFestivals((prev) =>
            prev.map((f) =>
              f.id === editingFestival.id
                ? {
                    ...f,
                    name: payload.name,
                    slug: payload.slug,
                    icon_url: payload.icon_url || null,
                    event_date: payload.event_date || null,
                    sort_order: payload.sort_order,
                    is_active: payload.is_active,
                  }
                : f
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
      const res = await toggleFestivalActive(id, currentStatus);
      if (res.success) {
        setFestivals((prev) =>
          prev.map((f) => (f.id === id ? { ...f, is_active: !currentStatus } : f))
        );
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to toggle status" });
      }
      setActionId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to deactivate or remove this festival?")) {
      return;
    }

    setActionId(id);
    startTransition(async () => {
      const res = await deleteFestival(id);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: res.message || "Festival updated.",
        });
        setFestivals((prev) =>
          prev.map((f) => (f.id === id ? { ...f, is_active: false } : f))
        );
      } else {
        setFeedbackMessage({ type: "error", text: res.error || "Failed to update festival" });
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
            <h1 className="text-2xl font-bold text-[#2B2625] font-serif">Indian Festivals</h1>
            <span className="bg-[#A74224]/10 text-[#A74224] text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
              {festivals.length} cultural celebrations
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Curate collections for Diwali, Holi, Navratri, Durga Puja, Eid, Onam, Pongal, and more.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#A74224] text-white text-sm font-semibold hover:bg-[#8D371E] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Festival</span>
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
                <th className="py-3.5 px-4">Festival</th>
                <th className="py-3.5 px-4">Slug</th>
                <th className="py-3.5 px-4">Calendar Date</th>
                <th className="py-3.5 px-4">Sort Order</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {festivals.map((fest) => {
                const isWorking = isPending && actionId === fest.id;
                return (
                  <tr key={fest.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Icon & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 rounded-lg bg-amber-50 border border-amber-200 overflow-hidden shrink-0 flex items-center justify-center text-amber-700">
                          {fest.icon_url ? (
                            <Image
                              src={fest.icon_url}
                              alt={fest.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <Sparkles size={18} />
                          )}
                        </div>
                        <span className="font-semibold text-stone-900">{fest.name}</span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-500">
                      /{fest.slug}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4">
                      {fest.event_date ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                          <Calendar size={13} className="text-stone-400" />
                          {fest.event_date}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400 italic">Seasonal / Annual</span>
                      )}
                    </td>

                    {/* Sort Order */}
                    <td className="py-3.5 px-4 font-mono text-xs text-stone-600">
                      {fest.sort_order}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleToggle(fest.id, fest.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          fest.is_active
                            ? "bg-stone-900 text-white hover:bg-stone-700"
                            : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                        }`}
                      >
                        {isWorking ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : fest.is_active ? (
                          <CheckCircle size={12} className="text-emerald-400" />
                        ) : (
                          <XCircle size={12} className="text-stone-400" />
                        )}
                        <span>{fest.is_active ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(fest)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-[#A74224] hover:bg-stone-100 transition-colors"
                          title="Edit festival"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleDelete(fest.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Deactivate festival"
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
        {festivals.map((fest) => {
          const isWorking = isPending && actionId === fest.id;
          return (
            <div
              key={fest.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative size-12 rounded-xl bg-amber-50 border border-amber-200 overflow-hidden shrink-0 flex items-center justify-center text-amber-700">
                  {fest.icon_url ? (
                    <Image
                      src={fest.icon_url}
                      alt={fest.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-stone-900 text-sm truncate">{fest.name}</h3>
                  <p className="text-xs text-stone-400 font-mono truncate">/{fest.slug}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {fest.event_date || "Seasonal"} • Order: {fest.sort_order}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => handleToggle(fest.id, fest.is_active)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    fest.is_active ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {fest.is_active ? "Active" : "Inactive"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(fest)}
                    className="px-3 py-1 rounded-lg border border-stone-200 text-xs font-semibold text-[#A74224]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => handleDelete(fest.id)}
                    className="px-3 py-1 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Deactivate
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
                {editingFestival ? `Edit Festival: ${editingFestival.name}` : "Create New Festival"}
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
                  Festival Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Diwali (Deepavali)"
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
                  placeholder="diwali"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                />
              </div>

              {/* Icon Upload or URL */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Icon / Decorative Image
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-stone-400 hover:border-[#A74224] bg-stone-50 cursor-pointer text-xs font-medium text-stone-700 transition-colors">
                    <Upload size={14} className="text-[#A74224]" />
                    <span>{isUploading ? "Uploading..." : "Upload Icon"}</span>
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
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Event / Festival Date (Optional)
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 focus:border-[#A74224] outline-none"
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
                    id="fest-active-check"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 text-[#A74224] rounded border-stone-300"
                  />
                  <label htmlFor="fest-active-check" className="text-xs font-semibold text-stone-800 cursor-pointer">
                    Active on Storefront
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
                    <span>Save Festival</span>
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
