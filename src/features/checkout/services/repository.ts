import "server-only";
import { createHash } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";
import type { CheckoutOrder, ShippingAddress } from "../types/checkout";

export type CheckoutContext = { userId?: string; sessionToken?: string };
export const guestTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

// Server operations only. Missing privilege or migration fails closed.
export async function commerceRpc<N extends keyof Database["public"]["Functions"]>(
  name: N, args: Database["public"]["Functions"][N]["Args"]
) {
  const { data, error } = await createAdminSupabaseClient().rpc(name, args);
  if (error) throw new Error("Commerce database operation failed");
  return data;
}

export async function prepareCheckout(context: CheckoutContext, address: ShippingAddress, key: string) {
  if (!context.userId && !context.sessionToken) throw new Error("Missing checkout authorization");
  const owner = context.userId ? `user:${context.userId}` : `guest:${guestTokenHash(context.sessionToken!)}`;
  const data = await commerceRpc("commerce_prepare_checkout", {
    p_user_id: context.userId ?? null,
    p_session_token: context.userId ? null : context.sessionToken ?? null,
    p_guest_hash: context.userId ? null : guestTokenHash(context.sessionToken!),
    p_key: guestTokenHash(`${owner}:${key}`),
    p_address: address as unknown as Json,
  });
  if (!data || typeof data !== "object" || !("id" in data)) throw new Error("Invalid checkout result");
  return data as unknown as CheckoutOrder;
}

export async function getOwnedOrderStatus(context: CheckoutContext, orderId: string) {
  const absent = { found: false, isPaid: false };
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || (!context.userId && !context.sessionToken)) return absent;
  try {
    let query = createAdminSupabaseClient().from("orders")
      .select("status, payment_status, order_number, payment_verified_at").eq("id", orderId);
    query = context.userId
      ? query.eq("user_id", context.userId)
      : query.is("user_id", null).eq("guest_token_hash", guestTokenHash(context.sessionToken!));
    const { data, error } = await query.maybeSingle();
    if (error || !data) return absent;
    return {
      found: true, status: data.status, paymentStatus: data.payment_status,
      orderNumber: data.order_number ?? undefined,
      isPaid: ["paid", "packed", "shipped", "delivered"].includes(data.status)
        && data.payment_status === "captured" && Boolean(data.payment_verified_at),
    };
  } catch {
    return absent;
  }
}

export async function pendingPaymentEventIds(limit: number) {
  const { data, error } = await createAdminSupabaseClient().from("webhook_events")
    .select("id").eq("provider", "razorpay").is("processed_at", null)
    .not("payload_hash", "is", null).order("created_at").limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error("Payment reconciliation unavailable");
  return (data ?? []).map(row => row.id);
}
