import { z } from "zod";

export const productSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(value => value === "" ? undefined : value, schema.optional());
const slug = optional(productSlugSchema.max(80));
const rupees = optional(z.string().regex(/^\d{1,7}(?:\.\d{1,2})?$/).transform(Number).pipe(z.number().min(0).max(1000000)));
export const catalogueFilters = z.object({
  q: z.string().trim().max(100).default(""), category: slug, festival: slug,
  page: z.preprocess(value => value === undefined ? 1 : value, z.union([z.string().regex(/^\d{1,4}$/), z.number()]).transform(Number).pipe(z.number().int().min(1).max(1000))),
  sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
  size: optional(z.string().trim().min(1).max(32).regex(/^[\p{L}\p{N} +.\/-]+$/u)),
  min: rupees, max: rupees,
  availability: optional(z.enum(["in-stock", "out-of-stock"])),
}).refine(value => value.min === undefined || value.max === undefined || value.min <= value.max, { message: "Minimum price exceeds maximum price" });
export type CatalogueFilters = z.infer<typeof catalogueFilters>;
export function literalSearch(value: string) { return value.replace(/[\\%_]/g, character => `\\${character}`); }
export const imageIdSchema = z.uuid();

export function catalogueHref(filters: CatalogueFilters, changes: Partial<CatalogueFilters> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...changes })) {
    if (value !== undefined && value !== "" && !(key === "page" && value === 1) && !(key === "sort" && value === "newest")) params.set(key, String(value));
  }
  return `/shop${params.size ? `?${params}` : ""}`;
}
