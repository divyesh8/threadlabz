import type { Category, Festival } from "@/lib/supabase/database.types";
import type { CatalogueFilters } from "../schemas/catalogue";

export type CatalogueImageData = { id: string; alt: string };
export type CatalogueCard = {
  id: string; slug: string; name: string; description: string | null;
  category: string; categorySlug: string; price_paise: number;
  images: CatalogueImageData[]; variants: { id: string; size: string; colour: string; stock: number }[];
};
export type CatalogueResult = {
  state: "preview" | "empty" | "ready" | "unavailable" | "invalid";
  products: CatalogueCard[]; categories: Category[]; festivals: Festival[];
  sizes: string[]; total: number; page: number; hasMore: boolean; filters: CatalogueFilters;
};
