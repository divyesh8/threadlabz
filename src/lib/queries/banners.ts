import "server-only";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { Banner } from "@/lib/supabase/database.types";

export async function getActiveBanners(placement?: "hero" | "festive"): Promise<Banner[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];

  try {
    let query = client
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (placement) {
      query = query.eq("placement", placement);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
