"use server";

import { cookies } from "next/headers";
import { getUser } from "@/lib/auth/guards";
import { initiateCheckoutSchema, type InitiateCheckoutInput } from "../schemas/checkout";
import { createCheckoutOrder } from "../services/checkout";
import { getRazorpayGatewayStatus } from "../services/payment";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CreateOrderResult, GatewayConfigStatus } from "../types/checkout";

const CART_SESSION_COOKIE = "tl_cart_session";

async function getCheckoutContext(): Promise<{ userId?: string; sessionToken?: string }> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CART_SESSION_COOKIE)?.value;
  const user = await getUser();

  return {
    userId: user?.id,
    sessionToken,
  };
}

export async function getGatewayStatusAction(): Promise<GatewayConfigStatus> {
  return getRazorpayGatewayStatus();
}

export async function createCheckoutOrderAction(
  rawInput: InitiateCheckoutInput
): Promise<CreateOrderResult> {
  const parsed = initiateCheckoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid shipping address",
      code: "VALIDATION_FAILED",
    };
  }

  const context = await getCheckoutContext();
  return await createCheckoutOrder(context, parsed.data.shippingAddress);
}

export async function checkOrderStatusAction(orderId: string): Promise<{
  found: boolean;
  status?: string;
  paymentStatus?: string;
  orderNumber?: string;
  isPaid: boolean;
}> {
  let client;
  try {
    client = createAdminSupabaseClient();
  } catch {
    client = await createServerSupabaseClient();
  }

  if (!client) {
    return { found: false, isPaid: false };
  }

  const { data: order } = await client
    .from("orders")
    .select("status, payment_status, order_number")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { found: false, isPaid: false };
  }

  const isPaid = order.status === "paid" || order.payment_status === "captured" || order.payment_status === "paid";
  return {
    found: true,
    status: order.status,
    paymentStatus: order.payment_status,
    orderNumber: order.order_number || undefined,
    isPaid,
  };
}
