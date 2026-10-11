import "server-only";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

import {
  getRazorpayGatewayStatus,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./signatures";

export {
  getRazorpayGatewayStatus,
  verifyPaymentSignature,
  verifyWebhookSignature,
};

/**
 * Creates an order on Razorpay API using server-authoritative integer paise.
 */
export async function createRazorpayOrder(params: {
  orderId: string;
  amountPaise: number;
  currency?: "INR";
}): Promise<{ success: boolean; razorpayOrderId?: string; error?: string }> {
  const status = getRazorpayGatewayStatus();
  if (!status.isConfigured) {
    return {
      success: false,
      error: status.blockerMessage,
    };
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const currency = params.currency || "INR";

  try {
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: params.amountPaise,
        currency,
        receipt: params.orderId,
        payment_capture: 1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: `Razorpay order creation failed: ${errorData}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      razorpayOrderId: data.id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Network error connecting to payment gateway: ${msg}`,
    };
  }
}

/**
 * Idempotent, server-authoritative Razorpay webhook event processing.
 */
export async function handleRazorpayWebhook(options: {
  rawBody: string;
  signature: string;
}): Promise<{ status: "success" | "duplicate" | "invalid_signature" | "ignored" | "error"; message: string }> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return {
      status: "error",
      message: "Webhook secret not configured on server.",
    };
  }

  // 1. Verify webhook signature over raw payload
  const isValid = verifyWebhookSignature({
    rawBody: options.rawBody,
    signature: options.signature,
    secret,
  });

  if (!isValid) {
    return {
      status: "invalid_signature",
      message: "Invalid webhook signature.",
    };
  }

  type RazorpayWebhookPayload = {
    event?: string;
    event_id?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          status?: string;
          error_description?: string;
        };
      };
      order?: {
        entity?: {
          id?: string;
          amount?: number;
          status?: string;
        };
      };
    };
    [key: string]: unknown;
  };

  // 2. Parse payload
  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(options.rawBody) as RazorpayWebhookPayload;
  } catch {
    return {
      status: "error",
      message: "Invalid JSON body in webhook request.",
    };
  }

  const eventType: string = payload.event || "unknown";
  const eventId: string =
    payload.event_id ||
    payload.payload?.payment?.entity?.id ||
    `evt_${crypto.randomUUID()}`;

  let client: ReturnType<typeof createAdminSupabaseClient>;
  try {
    client = createAdminSupabaseClient();
  } catch {
    return {
      status: "error",
      message: "Database client unavailable for webhook recording.",
    };
  }

  // 3. Record event in webhook_events table for strict idempotency
  const { data: existingEvent } = await client
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "razorpay")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent && existingEvent.processed_at) {
    return {
      status: "duplicate",
      message: `Event ${eventId} has already been processed.`,
    };
  }

  if (!existingEvent) {
    await client.from("webhook_events").insert({
      provider: "razorpay",
      event_id: eventId,
      payload: payload as unknown as Json,
      processed_at: null,
    });
  }

  // 4. Handle event lifecycle
  try {
    const paymentEntity = payload.payload?.payment?.entity;
    const razorpayOrderId: string | undefined = paymentEntity?.order_id;
    const razorpayPaymentId: string | undefined = paymentEntity?.id;
    const amountPaidPaise: number = paymentEntity?.amount || 0;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (razorpayOrderId) {
        // Find corresponding payment record
        const { data: paymentRecord } = await client
          .from("payments")
          .select("id, order_id, amount_paise, status")
          .eq("provider_order_id", razorpayOrderId)
          .maybeSingle();

        if (paymentRecord) {
          // Reconcile amount: ensure payment matches or exceeds recorded amount
          if (amountPaidPaise >= paymentRecord.amount_paise) {
            // Update payment record to paid
            await client
              .from("payments")
              .update({
                status: "paid",
                provider_payment_id: razorpayPaymentId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", paymentRecord.id);

            // Update order record to paid
            await client
              .from("orders")
              .update({
                status: "paid",
                payment_status: "paid",
                razorpay_payment_id: razorpayPaymentId,
              })
              .eq("id", paymentRecord.order_id);
          }
        }
      }
    } else if (eventType === "payment.failed") {
      if (razorpayOrderId) {
        const { data: paymentRecord } = await client
          .from("payments")
          .select("id, order_id")
          .eq("provider_order_id", razorpayOrderId)
          .maybeSingle();

        if (paymentRecord) {
          const failureReason =
            paymentEntity?.error_description || "Payment failed";
          await client
            .from("payments")
            .update({
              status: "failed",
              provider_payment_id: razorpayPaymentId,
              failure_reason: String(failureReason),
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);

          // Find active reservations for this order and release them
          const { data: reservations } = await client
            .from("inventory_reservations")
            .select("id")
            .eq("order_id", paymentRecord.order_id)
            .eq("status", "active");

          if (reservations) {
            for (const r of reservations) {
              await client.rpc("release_stock_reservation", {
                p_reservation_id: r.id,
              });
            }
          }
        }
      }
    }

    // Mark webhook event processed
    await client
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);

    return {
      status: "success",
      message: `Handled event ${eventType} successfully.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "error",
      message: `Failed executing webhook logic: ${msg}`,
    };
  }
}
