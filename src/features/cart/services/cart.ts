import "server-only";
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

const CHECKOUT_DISABLED_REASON =
  "Checkout is temporarily disabled until real inventory, business tax registration, and payment configuration are confirmed by the store owner.";

type CartContext = { userId?: string; sessionToken?: string };

function getClient() {
  try { return createAdminSupabaseClient(); } catch { return null; }
}

export async function getOrCreateCart(context: CartContext) {
  if (!context.userId && !context.sessionToken) return null;
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.rpc("commerce_cart", {
    p_user_id: context.userId ?? null,
    p_session_token: context.userId ? null : context.sessionToken ?? null,
  });
  if (error || !data) throw new Error("Shopping bag is temporarily unavailable.");
  return { id: data, user_id: context.userId ?? null };
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

  if (error || !rawItems) throw new Error("Shopping bag is temporarily unavailable.");

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

async function mutateCart(context: CartContext, operation: "add" | "set" | "remove", input: {
  variantId?: string; itemId?: string; quantity?: number;
}): Promise<{ success: boolean; cart?: CartSummary; error?: string }> {
  if (!context.userId && !context.sessionToken) return { success: false, error: "Shopping bag session missing." };
  try {
    const client = getClient();
    if (!client) throw new Error("Unavailable");
    const { error } = await client.rpc("commerce_mutate_cart", {
      p_user_id: context.userId ?? null,
      p_session_token: context.userId ? null : context.sessionToken ?? null,
      p_operation: operation, p_variant_id: input.variantId ?? null,
      p_item_id: input.itemId ?? null, p_qty: input.quantity ?? 0,
    });
    if (error) throw new Error("Mutation failed");
    return { success: true, cart: await getCartSummary(context) };
  } catch {
    return { success: false, error: "Could not update your bag. Check availability and retry." };
  }
}

export async function addToCart(context: CartContext, rawInput: unknown) {
  const parsed = addToCartSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: "Invalid cart item input" };
  return mutateCart(context, "add", parsed.data);
}

export async function updateCartItemQuantity(context: CartContext, rawInput: unknown) {
  const parsed = updateQuantitySchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: "Invalid quantity" };
  return mutateCart(context, "set", parsed.data);
}

export async function removeCartItem(context: CartContext, rawInput: unknown) {
  const parsed = removeItemSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: "Invalid item reference" };
  return mutateCart(context, "remove", parsed.data);
}

export async function mergeGuestCartIntoUserCart(guestSessionToken: string, userId: string) {
  const client = getClient();
  if (!client) throw new Error("Shopping bag is temporarily unavailable.");
  const { error } = await client.rpc("commerce_merge_cart", {
    p_user_id: userId, p_session_token: guestSessionToken,
  });
  if (error) throw new Error("Could not merge your shopping bag. Please retry.");
}
