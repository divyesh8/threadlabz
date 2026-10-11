import crypto from "node:crypto";
import type { GatewayConfigStatus } from "../types/checkout";

export function getRazorpayGatewayStatus(): GatewayConfigStatus {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const keyIdAvailable = Boolean(keyId && keyId.trim().length > 0);
  const keySecretAvailable = Boolean(keySecret && keySecret.trim().length > 0);
  const webhookSecretAvailable = Boolean(webhookSecret && webhookSecret.trim().length > 0);
  const isConfigured = keyIdAvailable && keySecretAvailable;

  let mode: "test" | "live" | "unconfigured" = "unconfigured";
  if (isConfigured) {
    mode = keyId?.startsWith("rzp_live_") ? "live" : "test";
  }

  let blockerMessage = "";
  if (!isConfigured) {
    blockerMessage =
      "Razorpay credentials are not configured. The store owner must provide RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET.";
  }

  return {
    isConfigured,
    mode,
    keyIdAvailable,
    keySecretAvailable,
    webhookSecretAvailable,
    blockerMessage,
  };
}

/**
 * Verify Razorpay checkout modal payment signature using HMAC SHA256 and timingSafeEqual.
 */
export function verifyPaymentSignature(options: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  secret?: string;
}): boolean {
  const secret = options.secret || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = options;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature.length !== razorpaySignature.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(razorpaySignature, "utf-8")
    );
  } catch {
    return false;
  }
}

/**
 * Verify Razorpay webhook raw body signature using HMAC SHA256 and timingSafeEqual.
 */
export function verifyWebhookSignature(options: {
  rawBody: string | Buffer;
  signature: string;
  secret?: string;
}): boolean {
  const secret = options.secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const { rawBody, signature } = options;
  if (!rawBody || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature.length !== signature.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch {
    return false;
  }
}
