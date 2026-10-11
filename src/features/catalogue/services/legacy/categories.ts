import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { Category } from "@/lib/supabase/database.types";

export async function getActiveCategories(): Promise<Category[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
