import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { imageIdSchema } from "@/features/catalogue/schemas/catalogue";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { PUBLIC_SOURCES } from "@/features/catalogue/services/catalogue";
import { isRaster, productStoragePath } from "@/features/media/services/product-media";
import { PRODUCT_IMAGE_WIDTHS } from "@/features/media/services/image-widths";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!imageIdSchema.safeParse(id).success) return new Response(null, { status: 404, headers });
  const widths = new URL(request.url).searchParams.getAll("w");
  const width = widths.length ? Number(widths[0]) : null;
  if (widths.length > 1 || (width !== null && !PRODUCT_IMAGE_WIDTHS.includes(width))) return new Response(null, { status: 400, headers });
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

    let body: Blob | Uint8Array<ArrayBuffer> = data;
    let contentType = data.type;
    if (width !== null) {
      try {
        const resized = await sharp(Buffer.from(await data.arrayBuffer()), { limitInputPixels: 40_000_000, failOn: "warning" })
          .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
        body = new Uint8Array(resized);
        contentType = "image/webp";
      } catch { return new Response(null, { status: 404, headers }); }
    }
    return new Response(body, {
      headers: {
        ...headers,
        "Content-Type": contentType,
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
