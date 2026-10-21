import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { commerceRpc, pendingPaymentEventIds, getOwnedCheckout, getOwnedOrderStatus, type CheckoutContext } from "./repository";
import { getRazorpayGatewayStatus, verifyWebhookSignature, verifyPaymentSignature } from "./signatures";
import { paymentCallbackSchema, type PaymentCallbackInput } from "../schemas/checkout";
export { getRazorpayGatewayStatus, verifyPaymentSignature, verifyWebhookSignature } from "./signatures";

const gatewayOrderSchema = z.object({
  id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  receipt: z.string(),
  amount: z.number().int().positive(),
  currency: z.literal("INR"),
});

async function gatewayRequest(path: string, body?: object) {
  if (!getRazorpayGatewayStatus().isConfigured) throw new Error("Test gateway unavailable");
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Payment gateway request failed");
  return await response.json() as unknown;
}

export async function createRazorpayOrder(params: { orderId: string; amountPaise: number; currency?: "INR" }) {
  try {
    if (!getRazorpayGatewayStatus().checkoutEnabled) throw new Error("Gateway unavailable");
    const order = gatewayOrderSchema.parse(await gatewayRequest("orders", {
      amount: params.amountPaise, currency: params.currency ?? "INR",
      receipt: params.orderId, partial_payment: false,
    }));
    if (order.receipt !== params.orderId || order.amount !== params.amountPaise) throw new Error("Gateway mismatch");
    return { success: true, razorpayOrderId: order.id };
  } catch {
    return { success: false, error: "Payment setup could not be verified." };
  }
}

// Internal recovery only, never a Server Action. Find the provider order by the
// durable local order UUID/receipt after an ambiguous POST, then verify it here.
export async function reconcileCheckoutPayment(orderId: string, providerOrderId: string) {
  if (!/^order_[A-Za-z0-9]+$/.test(providerOrderId)) throw new Error("Invalid provider order");
  const order = gatewayOrderSchema.parse(await gatewayRequest(`orders/${providerOrderId}`));
  if (order.receipt !== orderId || order.id !== providerOrderId) throw new Error("Gateway association mismatch");
  await commerceRpc("commerce_attach_gateway", {
    p_order_id: orderId, p_provider_id: order.id, p_amount: order.amount, p_currency: order.currency,
  });
  return reconcilePendingPaymentEvents();
}

export async function runReservationExpiryCleanup() {
  const count = await commerceRpc("release_expired_stock_reservations", {});
  return { releasedCount: Number(count) };
}

const webhookSchema = z.object({
  event: z.enum(["payment.captured", "payment.failed", "order.paid"]),
  payload: z.object({ payment: z.object({ entity: z.object({
    id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
    order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
    amount: z.number().int().positive().max(2147483647),
    currency: z.literal("INR"),
    status: z.enum(["captured", "failed"]),
    captured: z.boolean().optional(),
  }) }) }),
});

type WebhookResult = {
  status: "success" | "duplicate" | "invalid_signature" | "invalid_payload" | "ignored" | "error";
  message: string;
};

export async function handleRazorpayWebhook(options: {
  rawBody: string; signature: string; eventId?: string | null;
}): Promise<WebhookResult> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !getRazorpayGatewayStatus().isConfigured) return { status: "error", message: "Webhook unavailable." };
  if (!verifyWebhookSignature({ ...options, secret })) {
    return { status: "invalid_signature", message: "Invalid webhook signature." };
  }
  let raw: unknown;
  try { raw = JSON.parse(options.rawBody); } catch {
    return { status: "invalid_payload", message: "Invalid webhook payload." };
  }
  const event = z.object({ event: z.string() }).safeParse(raw);
  if (!event.success) return { status: "invalid_payload", message: "Invalid webhook payload." };
  if (!["payment.captured", "payment.failed", "order.paid"].includes(event.data.event)) {
    return { status: "ignored", message: "Unsupported event." };
  }
  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) return { status: "invalid_payload", message: "Invalid payment entity." };
  const payment = parsed.data.payload.payment.entity;
  const capture = parsed.data.event !== "payment.failed";
  if (payment.status !== (capture ? "captured" : "failed") || (capture && payment.captured === false)) {
    return { status: "invalid_payload", message: "Payment state mismatch." };
  }
  const hash = createHash("sha256").update(options.rawBody).digest("hex");
  const eventId = options.eventId || `body_${hash}`;
  if (eventId.length > 200) return { status: "invalid_payload", message: "Invalid event identity." };
  try {
    const id = await commerceRpc("commerce_record_event", {
      p_event_id: eventId, p_hash: hash,
      p_payload: {
        event: parsed.data.event, paymentId: payment.id, providerOrderId: payment.order_id,
        amount: payment.amount, currency: payment.currency,
      },
    });
    const status = await commerceRpc("commerce_process_event", { p_event_id: String(id) });
    if (status === "success" || status === "duplicate") return { status, message: "Payment event recorded." };
    return { status: "error", message: "Payment reconciliation pending." };
  } catch {
    return { status: "error", message: "Payment event processing failed; retry required." };
  }
}

const gatewayPaymentSchema = z.object({
  id: z.string().regex(/^pay_[A-Za-z0-9]+$/), order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  amount: z.number().int().positive(), currency: z.literal("INR"),
  status: z.enum(["created", "authorized", "captured", "refunded", "failed"]), captured: z.boolean().optional(),
});

export async function verifyCheckoutPayment(context: CheckoutContext, input: PaymentCallbackInput) {
  const pending = { found: false, isPaid: false, error: "Payment could not be confirmed. Check the saved order status before retrying." };
  const parsed = paymentCallbackSchema.safeParse(input);
  if (!parsed.success || !getRazorpayGatewayStatus().isConfigured) return pending;
  const stored = await getOwnedCheckout(context, parsed.data.orderId);
  if (!stored?.razorpay_order_id || stored.razorpay_order_id !== parsed.data.razorpay_order_id) return pending;
  // Sign using the persisted server order, never an untrusted browser order.
  if (!verifyPaymentSignature({ razorpayOrderId: stored.razorpay_order_id,
    razorpayPaymentId: parsed.data.razorpay_payment_id, razorpaySignature: parsed.data.razorpay_signature })) return pending;
  try {
    const payment = gatewayPaymentSchema.parse(await gatewayRequest(`payments/${parsed.data.razorpay_payment_id}`));
    if (payment.id !== parsed.data.razorpay_payment_id || payment.order_id !== stored.razorpay_order_id
      || payment.amount !== stored.total_paise || payment.currency !== stored.currency) return pending;
    if (payment.status === "captured" && payment.captured !== false) {
      const payload = { event: "payment.captured", paymentId: payment.id, providerOrderId: payment.order_id, amount: payment.amount, currency: payment.currency };
      const id = await commerceRpc("commerce_record_event", { p_event_id: `callback_${payment.id}_captured`,
        p_hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"), p_payload: payload });
      await commerceRpc("commerce_process_event", { p_event_id: String(id) });
    }
    // An authorized payment or valid callback signature alone is never success.
    return await getOwnedOrderStatus(context, stored.id);
  } catch { return pending; }
}

export async function reconcilePendingPaymentEvents(limit = 50) {
  const ids = await pendingPaymentEventIds(limit);
  const results = [];
  for (const id of ids) {
    try {
      results.push({ id, status: await commerceRpc("commerce_process_event", { p_event_id: id }) });
    } catch {
      results.push({ id, status: "retry" });
    }
  }
  return results;
}
