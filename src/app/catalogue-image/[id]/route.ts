import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { imageIdSchema } from "@/lib/catalogue/validation";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!imageIdSchema.safeParse(id).success) return new Response(null, { status: 404, headers });
  const client = createPublicSupabaseClient();
  if (!client) return new Response(null, { status: 404, headers });
  try {
    const { data: record, error } = await client.from("product_images")
      .select("storage_path").eq("id", id).eq("is_published", true).maybeSingle();
    if (error || !record) return new Response(null, { status: 404, headers });
    const { data, error: downloadError } = await client.storage.from("product-images").download(record.storage_path);
    if (downloadError || !data) return new Response(null, { status: 404, headers });
    if (data.size > 5242880 || !["image/jpeg", "image/png", "image/webp"].includes(data.type)) return new Response(null, { status: 404, headers });
    return new Response(data, { headers: { ...headers, "Content-Type": data.type, "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch { return new Response(null, { status: 503, headers }); }
}
