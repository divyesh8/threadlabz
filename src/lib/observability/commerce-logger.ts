/**
 * Structured, production-safe commerce observability logger.
 * Never logs secrets, passwords, full payment payloads, session tokens,
 * credit card numbers, or unnecessary personal identifying information (PII).
 */

export type CommerceEventType =
  | "checkout_started"
  | "checkout_rejected"
  | "reservation_created"
  | "reservation_released"
  | "razorpay_order_created"
  | "webhook_received"
  | "webhook_duplicate"
  | "payment_captured"
  | "payment_failed"
  | "order_paid"
  | "stock_finalized";

export interface CommerceLogPayload {
  orderId?: string;
  orderNumber?: string;
  variantId?: string;
  productId?: string;
  reservationId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amountPaise?: number;
  itemCount?: number;
  quantity?: number;
  reason?: string;
  errorCode?: string;
  eventId?: string;
  status?: string;
  [key: string]: unknown;
}

export function logCommerceEvent(
  event: CommerceEventType,
  payload: CommerceLogPayload = {}
): void {
  // Only known scalar identifiers/codes are accepted. A denylist cannot protect
  // nested payloads, differently-cased secret names, or arbitrary provider text.
  const safePayload: Record<string, unknown> = {};
  const allowedKeys = new Set([
    "orderId", "orderNumber", "variantId", "productId", "reservationId",
    "razorpayOrderId", "razorpayPaymentId", "amountPaise", "itemCount",
    "quantity", "reason", "errorCode", "eventId", "status",
  ]);

  for (const [key, value] of Object.entries(payload)) {
    if (allowedKeys.has(key) && (
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value))
    )) {
      safePayload[key] = value;
    }
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    channel: "commerce",
    event,
    ...safePayload,
  };

  // Structured single-line JSON output for log aggregators
  console.info(JSON.stringify(logEntry));
}
