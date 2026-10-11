import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { imageIdSchema } from "@/lib/catalogue/validation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { PUBLIC_SOURCES } from "@/lib/catalogue/query";
import { isRaster, productStoragePath } from "@/lib/catalogue/media";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!imageIdSchema.safeParse(id).success) return new Response(null, { status: 404, headers });
  const client = createPublicSupabaseClient();
  if (!client) return new Response(null, { status: 404, headers });

  try {
    const { data: record, error } = await client
      .from("product_images")
      .select("url, products!inner(is_active, source, categories!inner(is_active))")
      .eq("id", id)
      .eq("products.is_active", true)
      .in("products.source", PUBLIC_SOURCES)
      .eq("products.categories.is_active", true)
      .maybeSingle();

    if (error || !record) return new Response(null, { status: 404, headers });

    const path = productStoragePath(record.url, getSupabaseConfig()!.url);
    if (!path) return new Response(null, { status: 404, headers });

    const { data, error: downloadError } = await client.storage
      .from("product-images")
      .download(path);

    if (downloadError || !data) return new Response(null, { status: 404, headers });
    if (data.size === 0 || data.size > 5242880 || !isRaster(new Uint8Array(await data.slice(0, 12).arrayBuffer()), data.type)) {
      return new Response(null, { status: 404, headers });
    }

    return new Response(data, {
      headers: {
        ...headers,
        "Content-Type": data.type,
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
