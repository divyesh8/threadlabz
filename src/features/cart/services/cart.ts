import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PUBLIC_SOURCES } from "@/features/catalogue/services/catalogue";
import type { CartItem, CartSummary } from "../types/cart";
import {
  addToCartSchema,
  updateQuantitySchema,
  removeItemSchema,
} from "../schemas/cart";

type CartImageRow = {
  id: string;
  url: string;
  alt: string | null;
  is_primary: boolean;
  sort_order: number | null;
};

type CartItemJoinRow = {
  id: string;
  cart_id: string;
  variant_id: string;
  qty: number;
  updated_at: string;
  product_variants: {
    id: string;
    size: string;
    color: string;
    stock: number;
    stock_reserved: number;
    product_id: string;
    sku: string | null;
    products: {
      id: string;
      title: string;
      slug: string;
      price_paise: number;
      is_active: boolean;
      source: string;
      categories: {
        id: string;
        name: string;
        slug: string;
        is_active: boolean;
      };
      product_images?: CartImageRow[];
    };
  };
};

type VariantLookupRow = {
  id: string;
  size: string;
  color: string;
  stock: number;
  stock_reserved: number;
  products: {
    id: string;
    title: string;
    price_paise: number;
    is_active: boolean;
    source: string;
    categories: {
      id: string;
      is_active: boolean;
    };
  };
};

type UpdateCartItemRow = {
  id: string;
  variant_id: string;
  product_variants: {
    stock: number;
    stock_reserved: number;
  };
};

const CHECKOUT_DISABLED_REASON =
  "Checkout is temporarily disabled until real inventory, business tax registration, and payment configuration are confirmed by the store owner.";

function getAuthoritativeClient() {
  try {
    return createAdminSupabaseClient();
  } catch {
    return null;
  }
}

async function getClient() {
  const adminClient = getAuthoritativeClient();
  if (adminClient) return adminClient;
  return await createServerSupabaseClient();
}

export async function getOrCreateCart(context: { userId?: string; sessionToken?: string }) {
  const client = await getClient();
  if (!client) return null;

  const { userId, sessionToken } = context;
  if (!userId && !sessionToken) return null;

  // Try finding existing cart
  let query = client.from("carts").select("id, user_id, session_token");
  if (userId) {
    query = query.eq("user_id", userId);
  } else if (sessionToken) {
    query = query.eq("session_token", sessionToken);
  }

  const { data: existing, error } = await query.maybeSingle();
  if (existing && !error) return existing;

  // Insert new cart
  const insertPayload = {
    user_id: userId || null,
    session_token: sessionToken || null,
  };

  const { data: created, error: insertError } = await client
    .from("carts")
    .insert(insertPayload)
    .select("id, user_id, session_token")
    .single();

  if (insertError || !created) return null;
  return created;
}

export async function getCartSummary(context: { userId?: string; sessionToken?: string }): Promise<CartSummary> {
  const empty: CartSummary = {
    id: "",
    isGuest: !context.userId,
    items: [],
    totalItemCount: 0,
    subtotalPaise: 0,
    currency: "INR",
    checkoutDisabledReason: CHECKOUT_DISABLED_REASON,
  };

  const client = await getClient();
  if (!client) return empty;

  const cart = await getOrCreateCart(context);
  if (!cart) return empty;

  // Fetch cart items with full product and variant relations
  const { data: rawItems, error } = await client
    .from("cart_items")
    .select(`
      id,
      cart_id,
      variant_id,
      qty,
      updated_at,
      product_variants!inner (
        id,
        size,
        color,
        stock,
        stock_reserved,
        product_id,
        sku,
        products!inner (
          id,
          title,
          slug,
          price_paise,
          is_active,
          source,
          categories!inner (
            id,
            name,
            slug,
            is_active
          ),
          product_images (
            id,
            url,
            alt,
            is_primary,
            sort_order
          )
        )
      )
    `)
    .eq("cart_id", cart.id)
    .order("updated_at", { ascending: false });

  if (error || !rawItems) return { ...empty, id: cart.id };

  const validItems: CartItem[] = [];
  let subtotal = 0;
  let totalCount = 0;

  for (const row of (rawItems as unknown as CartItemJoinRow[])) {
    const v = row.product_variants;
    const p = v?.products;
    const cat = p?.categories;

    // Strict publication and purchasability revalidation on every server read
    const isPurchasable =
      p &&
      p.is_active === true &&
      PUBLIC_SOURCES.includes(p.source) &&
      cat &&
      cat.is_active === true;

    if (!isPurchasable) {
      // Do not include or sell demo/seed/inactive items
      continue;
    }

    const availableStock = Math.max(0, (v.stock ?? 0) - (v.stock_reserved ?? 0));
    // Quantity bounded strictly by stock and safety limits
    const safeQty = Math.max(1, Math.min(row.qty, availableStock || 1, 10));
    const unitPricePaise = Math.max(0, Math.round(p.price_paise));
    const lineTotalPaise = unitPricePaise * safeQty;

    const primaryImage = (p.product_images || []).sort(
      (a: CartImageRow, b: CartImageRow) =>
        Number(b.is_primary) - Number(a.is_primary) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )[0];

    validItems.push({
      id: row.id,
      variantId: v.id,
      productId: p.id,
      productSlug: p.slug,
      productTitle: p.title,
      categoryName: cat.name,
      categorySlug: cat.slug,
      size: v.size,
      colour: v.color,
      unitPricePaise,
      quantity: safeQty,
      lineTotalPaise,
      stockAvailable: availableStock,
      imageId: primaryImage?.id || null,
      imageAlt: primaryImage?.alt?.trim() || `${p.title} photograph`,
    });

    subtotal += lineTotalPaise;
    totalCount += safeQty;
  }

  return {
    id: cart.id,
    isGuest: !cart.user_id,
    items: validItems,
    totalItemCount: totalCount,
    subtotalPaise: subtotal,
    currency: "INR",
    checkoutDisabledReason: CHECKOUT_DISABLED_REASON,
  };
}

export async function addToCart(
  context: { userId?: string; sessionToken?: string },
  rawInput: unknown
): Promise<{ success: boolean; cart?: CartSummary; error?: string }> {
  const parsed = addToCartSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid cart item input" };
  }

  const { variantId, quantity } = parsed.data;
  const client = await getClient();
  if (!client) return { success: false, error: "Database client unavailable" };

  // Re-read variant and product directly from database to enforce server authority
  const { data: variant, error: variantError } = await client
    .from("product_variants")
    .select(`
      id,
      size,
      color,
      stock,
      stock_reserved,
      products!inner (
        id,
        title,
        price_paise,
        is_active,
        source,
        categories!inner (
          id,
          is_active
        )
      )
    `)
    .eq("id", variantId)
    .single();

  if (variantError || !variant) {
    return { success: false, error: "Selected product variant is not found." };
  }

  const row = variant as unknown as VariantLookupRow;
  const p = row.products;
  const cat = p?.categories;

  if (!p || !p.is_active || !PUBLIC_SOURCES.includes(p.source) || !cat?.is_active) {
    return { success: false, error: "This product is not currently available for purchase." };
  }

  const stockOnHand = variant.stock ?? 0;
  const stockReserved = variant.stock_reserved ?? 0;
  const availableStock = Math.max(0, stockOnHand - stockReserved);

  if (availableStock <= 0) {
    return { success: false, error: "Selected option is currently out of stock." };
  }

  const cart = await getOrCreateCart(context);
  if (!cart) return { success: false, error: "Could not create or locate your shopping bag." };

  // Check if item already exists in this cart
  const { data: existingItem } = await client
    .from("cart_items")
    .select("id, qty")
    .eq("cart_id", cart.id)
    .eq("variant_id", variantId)
    .maybeSingle();

  const currentQty = existingItem?.qty ?? 0;
  const desiredQty = currentQty + quantity;
  const safeQty = Math.min(desiredQty, availableStock, 10);

  if (safeQty <= currentQty && currentQty >= availableStock) {
    return {
      success: false,
      error: `Only ${availableStock} piece(s) available in stock.`,
    };
  }

  if (existingItem) {
    const { error: updateError } = await client
      .from("cart_items")
      .update({ qty: safeQty, updated_at: new Date().toISOString() })
      .eq("id", existingItem.id);

    if (updateError) return { success: false, error: "Could not update bag quantity." };
  } else {
    const { error: insertError } = await client.from("cart_items").insert({
      cart_id: cart.id,
      variant_id: variantId,
      qty: safeQty,
    });

    if (insertError) return { success: false, error: "Could not add item to shopping bag." };
  }

  const updatedSummary = await getCartSummary(context);
  return { success: true, cart: updatedSummary };
}

export async function updateCartItemQuantity(
  context: { userId?: string; sessionToken?: string },
  rawInput: unknown
): Promise<{ success: boolean; cart?: CartSummary; error?: string }> {
  const parsed = updateQuantitySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid quantity" };
  }

  const { itemId, quantity } = parsed.data;
  const client = await getClient();
  if (!client) return { success: false, error: "Database client unavailable" };

  const cart = await getOrCreateCart(context);
  if (!cart) return { success: false, error: "Cart not found" };

  // If quantity requested is 0, remove the item
  if (quantity === 0) {
    await client.from("cart_items").delete().eq("id", itemId).eq("cart_id", cart.id);
    const updated = await getCartSummary(context);
    return { success: true, cart: updated };
  }

  // Verify item belongs to this cart and check variant stock
  const { data: item, error: itemError } = await client
    .from("cart_items")
    .select("id, variant_id, product_variants!inner(stock, stock_reserved)")
    .eq("id", itemId)
    .eq("cart_id", cart.id)
    .single();

  if (itemError || !item) {
    return { success: false, error: "Cart item not found" };
  }

  const row = item as unknown as UpdateCartItemRow;
  const v = row.product_variants;
  const available = Math.max(0, (v?.stock ?? 0) - (v?.stock_reserved ?? 0));
  const safeQty = Math.max(1, Math.min(quantity, available, 10));

  await client
    .from("cart_items")
    .update({ qty: safeQty, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  const updated = await getCartSummary(context);
  return { success: true, cart: updated };
}

export async function removeCartItem(
  context: { userId?: string; sessionToken?: string },
  rawInput: unknown
): Promise<{ success: boolean; cart?: CartSummary; error?: string }> {
  const parsed = removeItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid item reference" };
  }

  const client = await getClient();
  if (!client) return { success: false, error: "Database client unavailable" };

  const cart = await getOrCreateCart(context);
  if (!cart) return { success: false, error: "Cart not found" };

  await client.from("cart_items").delete().eq("id", parsed.data.itemId).eq("cart_id", cart.id);
  const updated = await getCartSummary(context);
  return { success: true, cart: updated };
}

export async function mergeGuestCartIntoUserCart(guestSessionToken: string, userId: string) {
  if (!guestSessionToken || !userId) return;

  const client = await getClient();
  if (!client) return;

  // Find guest cart
  const { data: guestCart } = await client
    .from("carts")
    .select("id")
    .eq("session_token", guestSessionToken)
    .maybeSingle();

  if (!guestCart) return;

  // Find or create customer cart
  const userCart = await getOrCreateCart({ userId });
  if (!userCart || userCart.id === guestCart.id) return;

  // Get guest items
  const { data: guestItems } = await client
    .from("cart_items")
    .select("id, variant_id, qty")
    .eq("cart_id", guestCart.id);

  if (guestItems && guestItems.length > 0) {
    // Get user's existing items
    const { data: userItems } = await client
      .from("cart_items")
      .select("id, variant_id, qty")
      .eq("cart_id", userCart.id);

    const userItemMap = new Map((userItems || []).map(i => [i.variant_id, i]));

    for (const gi of guestItems) {
      const existing = userItemMap.get(gi.variant_id);
      if (existing) {
        // Merge without losing valid quantity, max 10
        const mergedQty = Math.min(existing.qty + gi.qty, 10);
        await client
          .from("cart_items")
          .update({ qty: mergedQty, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await client.from("cart_items").insert({
          cart_id: userCart.id,
          variant_id: gi.variant_id,
          qty: Math.min(gi.qty, 10),
        });
      }
    }
  }

  // Delete guest cart
  await client.from("carts").delete().eq("id", guestCart.id);
}
