import { z } from "zod";

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const adminProductSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120, "Slug is too long")
    .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens (e.g. festive-kurta)"),
  description: z.string().trim().max(4000).optional().default(""),
  category_id: z.string().uuid().nullable().optional(),
  audience: z.enum(["men", "women", "kids", "unisex"]).default("unisex"),
  price_rupees: z.number().min(0, "Price cannot be negative"),
  compare_at_rupees: z.number().min(0).nullable().optional(),
  badge: z.string().trim().max(40).nullable().optional(),
  is_active: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        size: z.string().trim().min(1, "Size is required").max(32),
        color: z.string().trim().min(1, "Color is required").max(60),
        stock: z.number().int().min(0, "Stock cannot be negative"),
        sku: z.string().trim().max(80).nullable().optional(),
      })
    )
    .min(1, "At least one variant is required"),
  images: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        url: z.string().min(1, "Image URL is required"),
        alt: z.string().trim().max(240).nullable().optional(),
        sort_order: z.number().int().min(0).default(0),
        is_primary: z.boolean().default(false),
      })
    )
    .default([]),
  festival_ids: z.array(z.string().uuid()).default([]),
});

export const adminCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens"),
  image_url: z.string().trim().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const adminFestivalSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80)
    .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens"),
  icon_url: z.string().trim().nullable().optional(),
  event_date: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const adminBannerSchema = z.object({
  id: z.string().uuid().optional(),
  placement: z.enum(["hero", "festive"]),
  title: z.string().trim().min(1, "Title is required"),
  subtitle: z.string().trim().nullable().optional(),
  image_url: z.string().trim().nullable().optional(),
  cta_label: z.string().trim().nullable().optional(),
  cta_href: z.string().trim().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
});

export type AdminProductInput = z.infer<typeof adminProductSchema>;
export type AdminCategoryInput = z.infer<typeof adminCategorySchema>;
export type AdminFestivalInput = z.infer<typeof adminFestivalSchema>;
export type AdminBannerInput = z.infer<typeof adminBannerSchema>;
