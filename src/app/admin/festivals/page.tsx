import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FestivalManager, type FestivalItem } from "@/features/admin/components/festival-manager";

export const dynamic = "force-dynamic";

export default async function AdminFestivalsPage() {
  const client = await createServerSupabaseClient();

  let festivalsList: FestivalItem[] = [];

  if (client) {
    const { data, error } = await client
      .from("festivals")
      .select("id, name, slug, icon_url, event_date, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data) {
      festivalsList = data;
    }
  }

  return <FestivalManager initialFestivals={festivalsList} />;
}
