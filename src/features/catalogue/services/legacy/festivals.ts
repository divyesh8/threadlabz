import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { Festival } from "@/lib/supabase/database.types";

export async function getActiveFestivals(): Promise<Festival[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("festivals")
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
