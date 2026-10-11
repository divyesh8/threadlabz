import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isRaster, productStoragePath } from "@/lib/catalogue/media";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  await requireAdmin();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  const path = productStoragePath(new URL(request.url).searchParams.get("path") ?? "", getSupabaseConfig()!.url);
  if (!path) return new Response(null, { status: 404, headers });
  try {
    // Uses the verified admin's session and Storage RLS, never a service key.
    const client = await createServerSupabaseClient();
    const result = await client!.storage.from("product-images").download(path);
    const data = result.data;
    if (result.error || !data || data.size > 5242880 || !isRaster(new Uint8Array(await data.slice(0, 12).arrayBuffer()), data.type)) return new Response(null, { status: 404, headers });
    return new Response(data, { headers: { ...headers, "Content-Type": data.type } });
  } catch { return new Response(null, { status: 503, headers }); }
}
