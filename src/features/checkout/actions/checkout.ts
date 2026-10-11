"use server";

import { cookies } from "next/headers";
import { getUser } from "@/lib/auth/guards";
import { initiateCheckoutSchema, type InitiateCheckoutInput } from "../schemas/checkout";
import { createCheckoutOrder } from "../services/checkout";
import { getRazorpayGatewayStatus } from "../services/payment";
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
