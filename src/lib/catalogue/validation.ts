import { z } from "zod";

const slug = z.preprocess(value => value === "" ? undefined : value, z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).optional());
export const catalogueFilters = z.object({
  q: z.string().trim().max(100).default(""), category: slug, festival: slug,
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type CatalogueFilters = z.infer<typeof catalogueFilters>;
export function literalSearch(value: string) { return value.replace(/[\\%_]/g, character => `\\${character}`); }
export const imageIdSchema = z.uuid();
