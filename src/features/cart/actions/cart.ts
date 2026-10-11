"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth/guards";
import {
  getCartSummary,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  mergeGuestCartIntoUserCart,
} from "../services/cart";
import type { AddToCartInput, UpdateQuantityInput, RemoveItemInput } from "../schemas/cart";
import type { CartSummary } from "../types/cart";

const CART_SESSION_COOKIE = "tl_cart_session";

async function getCartContext(): Promise<{ userId?: string; sessionToken: string }> {
  const cookieStore = await cookies();
  let sessionToken = cookieStore.get(CART_SESSION_COOKIE)?.value;

  if (!sessionToken || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionToken)) {
    sessionToken = crypto.randomUUID();
    cookieStore.set(CART_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  const user = await getUser();
  if (user) {
    // If user is logged in and has an active guest cart cookie, merge once
    try {
      await mergeGuestCartIntoUserCart(sessionToken, user.id);
    } catch {
      // Non-fatal if merge fails
    }
    return { userId: user.id, sessionToken };
  }

  return { sessionToken };
}

export async function getCartAction(): Promise<CartSummary> {
  const context = await getCartContext();
  return await getCartSummary(context);
}

export async function addToCartAction(
  input: AddToCartInput
): Promise<{ success: boolean; cart?: CartSummary; error?: string }> {
  const context = await getCartContext();
  const result = await addToCart(context, input);

  if (result.success) {
    revalidatePath("/cart");
  }

  return result;
}

export async function updateQuantityAction(
  input: UpdateQuantityInput
): Promise<{ success: boolean; cart?: CartSummary; error?: string }> {
  const context = await getCartContext();
  const result = await updateCartItemQuantity(context, input);

  if (result.success) {
    revalidatePath("/cart");
  }

  return result;
}

export async function removeItemAction(
  input: RemoveItemInput
): Promise<{ success: boolean; cart?: CartSummary; error?: string }> {
  const context = await getCartContext();
  const result = await removeCartItem(context, input);

  if (result.success) {
    revalidatePath("/cart");
  }

  return result;
}
