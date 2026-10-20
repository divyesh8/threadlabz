import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const label = text(60).min(1, "A measurement or specification label is required");
const unique = (values: string[]) => new Set(values.map(v => v.toLowerCase())).size === values.length;

export const sizeGuideSchema = z.object({
  unit: z.enum(["cm", "in"]),
  kind: z.enum(["garment", "body"]),
  instructions: text(1200).min(1, "Explain how these measurements were taken"),
  columns: z.array(label).min(1).max(6),
  rows: z.array(z.object({
    size: text(32).min(1),
    values: z.array(z.number().positive("Enter a verified measurement greater than zero").max(500)).min(1).max(6),
  }).strict()).min(1, "Add at least one measured size").max(30),
}).strict().superRefine((guide, ctx) => {
  if (!unique(guide.columns)) ctx.addIssue({ code: "custom", path: ["columns"], message: "Measurement labels must be unique" });
  if (!unique(guide.rows.map(row => row.size))) ctx.addIssue({ code: "custom", path: ["rows"], message: "Each size may appear once in a size guide" });
  guide.rows.forEach((row, i) => {
    if (row.values.length !== guide.columns.length) ctx.addIssue({ code: "custom", path: ["rows", i], message: "Provide every measurement for each size" });
  });
});

// Optional, product-specific facts. No defaults for measurements or product claims.
export const productDetailsSchema = z.object({
  version: z.literal(1),
  materials: text(1600).default(""),
  care: text(1600).default(""),
  fit: text(800).default(""),
  model: z.object({
    height_cm: z.number().positive().max(300),
    wears_size: text(32).min(1, "Enter the size worn in the photograph"),
  }).strict().nullable().default(null),
  specifications: z.array(z.object({ label, value: text(400).min(1) }).strict()).max(12).default([]),
  size_guide: sizeGuideSchema.nullable().default(null),
}).strict().superRefine((details, ctx) => {
  if (new TextEncoder().encode(JSON.stringify(details)).length > 32768) ctx.addIssue({ code: "custom", message: "Product information is too long. Shorten the supplied text." });
  if (details.fit && !details.size_guide) ctx.addIssue({ code: "custom", path: ["fit"], message: "Add verified size-guide measurements to support the fit description" });
  if (!unique(details.specifications.map(spec => spec.label))) ctx.addIssue({ code: "custom", path: ["specifications"], message: "Specification labels must be unique" });
});

export type ProductDetails = z.infer<typeof productDetailsSchema>;
export type SizeGuide = z.infer<typeof sizeGuideSchema>;

export function readProductDetails(input: unknown): ProductDetails {
  const parsed = productDetailsSchema.safeParse(input);
  return parsed.success ? parsed.data : productDetailsSchema.parse({ version: 1 });
}
