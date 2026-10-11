"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isRaster } from "@/features/media/services/product-media";
import {
  adminProductSchema,
  adminCategorySchema,
  adminFestivalSchema,
  adminBannerSchema,
  type AdminProductInput,
  type AdminCategoryInput,
  type AdminFestivalInput,
  type AdminBannerInput,
} from "@/features/admin/schemas/admin";

export type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  id?: string;
  url?: string;
};

// -----------------------------------------------------------------------------
// 1. PRODUCTS
// -----------------------------------------------------------------------------

export async function saveProduct(input: AdminProductInput): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = adminProductSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid product data" };
  }

  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const data = parsed.data;
  const pricePaise = Math.round(data.price_rupees * 100);
  const compareAtPaise = data.compare_at_rupees ? Math.round(data.compare_at_rupees * 100) : null;

  try {
    let productId = data.id;

    if (productId) {
      // Update product
      const { error: updateError } = await client
        .from("products")
        .update({
          title: data.title,
          slug: data.slug,
          description: data.description || null,
          category_id: data.category_id || null,
          audience: data.audience,
          price_paise: pricePaise,
          compare_at_paise: compareAtPaise,
          badge: data.badge || null,
          is_active: data.is_active,
        })
        .eq("id", productId);

      if (updateError) {
        return { error: `Failed to update product: ${updateError.message}` };
      }
    } else {
      // Create product
      const { data: newProd, error: insertError } = await client
        .from("products")
        .insert({
          title: data.title,
          slug: data.slug,
          description: data.description || null,
          category_id: data.category_id || null,
          audience: data.audience,
          price_paise: pricePaise,
          compare_at_paise: compareAtPaise,
          badge: data.badge || null,
          is_active: data.is_active,
          source: "admin",
        })
        .select("id")
        .single();

      if (insertError || !newProd) {
        return { error: `Failed to create product: ${insertError?.message || "Unknown error"}` };
      }
      productId = newProd.id;
    }

    // Synchronize Variants
    const { data: existingVariants } = await client
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    const existingVarIds = new Set(existingVariants?.map((v) => v.id) || []);
    const submittedVarIds = new Set(data.variants.map((v) => v.id).filter(Boolean));

    // Delete removed variants
    for (const exId of existingVarIds) {
      if (!submittedVarIds.has(exId)) {
        await client.from("product_variants").delete().eq("id", exId);
      }
    }

    // Upsert variants
    for (const v of data.variants) {
      if (v.id && existingVarIds.has(v.id)) {
        await client
          .from("product_variants")
          .update({
            size: v.size,
            color: v.color,
            stock: v.stock,
            sku: v.sku || null,
          })
          .eq("id", v.id);
      } else {
        await client.from("product_variants").insert({
          product_id: productId,
          size: v.size,
          color: v.color,
          stock: v.stock,
          sku: v.sku || null,
        });
      }
    }

    // Synchronize Images
    const { data: existingImgs } = await client
      .from("product_images")
      .select("id")
      .eq("product_id", productId);

    const existingImgIds = new Set(existingImgs?.map((i) => i.id) || []);
    const submittedImgIds = new Set(data.images.map((i) => i.id).filter(Boolean));

    // Delete removed images
    for (const imgId of existingImgIds) {
      if (!submittedImgIds.has(imgId)) {
        await client.from("product_images").delete().eq("id", imgId);
      }
    }

    // Upsert images
    for (let idx = 0; idx < data.images.length; idx++) {
      const img = data.images[idx];
      const isPrimary = idx === 0 || img.is_primary;
      if (img.id && existingImgIds.has(img.id)) {
        await client
          .from("product_images")
          .update({
            url: img.url,
            alt: img.alt || null,
            sort_order: idx,
            is_primary: isPrimary,
          })
          .eq("id", img.id);
      } else {
        await client.from("product_images").insert({
          product_id: productId,
          url: img.url,
          alt: img.alt || null,
          sort_order: idx,
          is_primary: isPrimary,
        });
      }
    }

    // Synchronize Festivals
    await client.from("product_festivals").delete().eq("product_id", productId);
    if (data.festival_ids.length > 0) {
      const pfRows = data.festival_ids.map((festId) => ({
        product_id: productId,
        festival_id: festId,
      }));
      await client.from("product_festivals").insert(pfRows);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");

    return {
      success: true,
      id: productId,
      message: data.id ? "Product updated successfully." : "Product created successfully.",
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to save product" };
  }
}

export async function toggleProductActive(id: string, currentStatus: boolean): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const { error } = await client
    .from("products")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  return { success: true };
}

export async function deleteOrDeactivateProduct(id: string): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  // Check if product is referenced in order items
  const { data: orderItemRefs } = await client
    .from("order_items")
    .select("id")
    .eq("product_id", id)
    .limit(1);

  if (orderItemRefs && orderItemRefs.length > 0) {
    // Deactivate instead to preserve historical order details
    await client.from("products").update({ is_active: false }).eq("id", id);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return {
      success: true,
      message: "Product is referenced by orders. It has been deactivated to preserve order history.",
    };
  }

  // Safe to delete product (cascades to variants, images, product_festivals)
  const { error } = await client.from("products").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  return { success: true, message: "Product deleted successfully." };
}

// -----------------------------------------------------------------------------
// 2. CATEGORIES
// -----------------------------------------------------------------------------

export async function saveCategory(input: AdminCategoryInput): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = adminCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid category data" };
  }

  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const data = parsed.data;

  if (data.id) {
    const { error } = await client
      .from("categories")
      .update({
        name: data.name,
        slug: data.slug,
        image_url: data.image_url || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
      .eq("id", data.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await client.from("categories").insert({
      name: data.name,
      slug: data.slug,
      image_url: data.image_url || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/");
  return { success: true, message: "Category saved successfully." };
}

export async function toggleCategoryActive(id: string, currentStatus: boolean): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const { error } = await client
    .from("categories")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  // Check if products reference this category
  const { data: prods } = await client
    .from("products")
    .select("id")
    .eq("category_id", id)
    .limit(1);

  if (prods && prods.length > 0) {
    // Safe deactivation
    await client.from("categories").update({ is_active: false }).eq("id", id);
    revalidatePath("/admin/categories");
    return {
      success: true,
      message: "Category is referenced by existing products and has been deactivated instead of deleted.",
    };
  }

  const { error } = await client.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  return { success: true, message: "Category deleted." };
}

// -----------------------------------------------------------------------------
// 3. FESTIVALS
// -----------------------------------------------------------------------------

export async function saveFestival(input: AdminFestivalInput): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = adminFestivalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid festival data" };
  }

  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const data = parsed.data;

  if (data.id) {
    const { error } = await client
      .from("festivals")
      .update({
        name: data.name,
        slug: data.slug,
        icon_url: data.icon_url || null,
        event_date: data.event_date || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
      .eq("id", data.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await client.from("festivals").insert({
      name: data.name,
      slug: data.slug,
      icon_url: data.icon_url || null,
      event_date: data.event_date || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/festivals");
  revalidatePath("/shop");
  revalidatePath("/");
  return { success: true, message: "Festival saved successfully." };
}

export async function toggleFestivalActive(id: string, currentStatus: boolean): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const { error } = await client
    .from("festivals")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/festivals");
  return { success: true };
}

export async function deleteFestival(id: string): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  // Deactivate instead of cascading deletion
  const { error } = await client.from("festivals").update({ is_active: false }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/festivals");
  return { success: true, message: "Festival deactivated." };
}

// -----------------------------------------------------------------------------
// 4. BANNERS
// -----------------------------------------------------------------------------

export async function saveBanner(input: AdminBannerInput): Promise<ActionResponse> {
  await requireAdmin();
  const parsed = adminBannerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid banner data" };
  }

  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const data = parsed.data;

  if (data.id) {
    const { error } = await client
      .from("banners")
      .update({
        placement: data.placement,
        title: data.title,
        subtitle: data.subtitle || null,
        image_url: data.image_url || null,
        cta_label: data.cta_label || null,
        cta_href: data.cta_href || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
      })
      .eq("id", data.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await client.from("banners").insert({
      placement: data.placement,
      title: data.title,
      subtitle: data.subtitle || null,
      image_url: data.image_url || null,
      cta_label: data.cta_label || null,
      cta_href: data.cta_href || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true, message: "Banner saved successfully." };
}

export async function toggleBannerActive(id: string, currentStatus: boolean): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const { error } = await client
    .from("banners")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBanner(id: string): Promise<ActionResponse> {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const { error } = await client.from("banners").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true, message: "Banner deleted." };
}

// -----------------------------------------------------------------------------
// 5. SECURE IMAGE UPLOAD
// -----------------------------------------------------------------------------

export async function uploadAdminImage(formData: FormData): Promise<ActionResponse> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only JPG, PNG and WebP photographs are allowed." };
  }

  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return { error: "Maximum file size is 5 MB." };
  }

  const client = await createServerSupabaseClient();
  if (!client) return { error: "Database client unavailable" };

  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
  const safeName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `uploads/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isRaster(buffer, file.type)) return { error: "The file does not contain a supported photograph." };

  const { error: uploadError } = await client.storage
    .from("product-images")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  // Store a durable path; do not persist public or expiring signed URLs.
  return { success: true, url: filePath };
}
