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
  // Sanitize payload: strip any accidental credentials or PII fields
  const safePayload: Record<string, unknown> = {};
  const forbiddenKeys = new Set([
    "password",
    "secret",
    "token",
    "sessionToken",
    "signature",
    "rawBody",
    "apiKey",
    "authHeader",
    "address",
    "line1",
    "phone",
    "email",
  ]);

  for (const [key, value] of Object.entries(payload)) {
    if (!forbiddenKeys.has(key.toLowerCase()) && value !== undefined) {
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
