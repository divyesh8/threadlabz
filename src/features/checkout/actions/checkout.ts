"use server";

import { cookies } from "next/headers";
import { getUser } from "@/lib/auth/guards";
import { initiateCheckoutSchema, type InitiateCheckoutInput, type PaymentCallbackInput } from "../schemas/checkout";
import { createCheckoutOrder } from "../services/checkout";
import { getRazorpayGatewayStatus, verifyCheckoutPayment } from "../services/payment";
import { getOwnedOrderStatus, getOwnedCheckoutSnapshot, getCheckoutIdForAttempt } from "../services/repository";
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
  return await createCheckoutOrder(context, parsed.data.shippingAddress, { idempotencyKey: parsed.data.idempotencyKey });
}

export async function checkOrderStatusAction(orderId: string) {
  if (typeof orderId !== "string") return { found: false, isPaid: false };
  return getOwnedOrderStatus(await getCheckoutContext(), orderId);
}

export async function verifyCheckoutPaymentAction(input: PaymentCallbackInput) {
  return verifyCheckoutPayment(await getCheckoutContext(), input);
}

export async function resumeCheckoutAction(orderId: string) {
  if (typeof orderId !== "string") return null;
  try {
    const saved = await getOwnedCheckoutSnapshot(await getCheckoutContext(), orderId);
    if (!saved) return null;
    const gatewayStatus = getRazorpayGatewayStatus();
    return { ...saved, canPay: saved.canPay && gatewayStatus.checkoutEnabled,
      keyId: gatewayStatus.checkoutEnabled ? process.env.RAZORPAY_KEY_ID! : null };
  } catch { return null; }
}

export async function resumeCheckoutAttemptAction(attempt: string) {
  if (typeof attempt !== "string") return null;
  try {
    const id = await getCheckoutIdForAttempt(await getCheckoutContext(), attempt);
    return id ? resumeCheckoutAction(id) : null;
  } catch { return null; }
}
