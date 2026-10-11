import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BannerManager, type BannerItem } from "@/components/admin/banner-manager";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const client = await createServerSupabaseClient();

  let bannersList: BannerItem[] = [];

  if (client) {
    const { data, error } = await client
      .from("banners")
      .select("*")
      .order("placement", { ascending: true })
      .order("sort_order", { ascending: true });

    if (!error && data) {
      bannersList = data as BannerItem[];
    }
  }

  return <BannerManager initialBanners={bannersList} />;
}
