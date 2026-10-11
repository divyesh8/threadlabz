import "server-only";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCartSummary } from "@/features/cart/services/cart";
import { calculateOrderPricing } from "./pricing";
import { getRazorpayGatewayStatus, createRazorpayOrder } from "./payment";
import type { Json } from "@/types/database";
import type {
  ShippingAddress,
  CheckoutOrder,
  CreateOrderResult,
  OrderSnapshotItem,
} from "../types/checkout";

function getAuthoritativeClient() {
  try {
    return createAdminSupabaseClient();
  } catch {
    return null;
  }
}

async function getClient() {
  const adminClient = getAuthoritativeClient();
  if (adminClient) return adminClient;
  return await createServerSupabaseClient();
}

export async function createCheckoutOrder(
  context: { userId?: string; sessionToken?: string },
  shippingAddress: ShippingAddress
): Promise<CreateOrderResult> {
  const client = await getClient();
  if (!client) {
    return { success: false, error: "Database client unavailable", code: "GATEWAY_UNAVAILABLE" };
  }

  // 1. Re-read cart and validate active purchasable items
  const cart = await getCartSummary(context);
  if (!cart || cart.items.length === 0) {
    return { success: false, error: "Your shopping bag is empty.", code: "INVALID_CART" };
  }

  // 2. Authoritative integer-paise pricing calculation on server
  const pricingItems = cart.items.map((i) => ({
    unitPricePaise: i.unitPricePaise,
    quantity: i.quantity,
  }));
  const pricing = calculateOrderPricing(pricingItems, {
    shippingPaise: 0, // Free shipping during launch preview
    taxRateBps: 500,  // 5% inclusive GST standard for apparel
    isTaxInclusive: true,
  });

  const orderNumber = `TL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 3. Create order record
  const { data: orderRow, error: orderError } = await client
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: context.userId || null,
      status: "pending",
      payment_status: "unpaid",
      subtotal_paise: pricing.subtotalPaise,
      shipping_paise: pricing.shippingPaise,
      tax_paise: pricing.taxPaise,
      discount_paise: pricing.discountPaise,
      total_paise: pricing.grandTotalPaise,
      currency: "INR",
      shipping_address: shippingAddress as unknown as Json,
    })
    .select("id, order_number, status, payment_status, total_paise, currency, created_at")
    .single();

  if (orderError || !orderRow) {
    return {
      success: false,
      error: "Could not create order. Please try again.",
      code: "VALIDATION_FAILED",
    };
  }

  // 4. Create immutable order-item snapshots
  const snapshotItems: OrderSnapshotItem[] = [];
  const reservedReservationIds: string[] = [];

  for (const item of cart.items) {
    // Attempt atomic database stock reservation
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: reservationId, error: rpcError } = await client.rpc("reserve_stock", {
      p_variant_id: item.variantId,
      p_qty: item.quantity,
      p_expires_at: expiresAt,
      p_order_id: orderRow.id,
    });

    if (rpcError || !reservationId) {
      // Stock reservation failed for this line. Roll back all held reservations for this order.
      for (const resId of reservedReservationIds) {
        await client.rpc("release_stock_reservation", {
          p_reservation_id: resId,
        });
      }

      await client.from("orders").update({ status: "cancelled" }).eq("id", orderRow.id);

      return {
        success: false,
        error: `Insufficient stock for ${item.productTitle} (${item.size}).`,
        code: "OUT_OF_STOCK",
      };
    }

    reservedReservationIds.push(reservationId as string);

    // Insert order item row
    await client.from("order_items").insert({
      order_id: orderRow.id,
      product_id: item.productId,
      variant_id: item.variantId,
      title_snapshot: item.productTitle,
      size: item.size,
      sku: null,
      price_paise: item.unitPricePaise,
      tax_paise: Math.round((item.lineTotalPaise * 500) / (10000 + 500)),
      qty: item.quantity,
    });

    snapshotItems.push({
      variantId: item.variantId,
      productId: item.productId,
      title: item.productTitle,
      sku: null,
      size: item.size,
      colour: item.colour,
      unitPricePaise: item.unitPricePaise,
      quantity: item.quantity,
      lineTotalPaise: item.lineTotalPaise,
      taxPaise: Math.round((item.lineTotalPaise * 500) / (10000 + 500)),
    });
  }

  // 5. Payment gateway setup
  const gatewayStatus = getRazorpayGatewayStatus();
  let razorpayOrderId: string | undefined;

  if (gatewayStatus.isConfigured) {
    const rzpResult = await createRazorpayOrder({
      orderId: orderRow.id,
      amountPaise: pricing.grandTotalPaise,
      currency: "INR",
    });

    if (rzpResult.success && rzpResult.razorpayOrderId) {
      razorpayOrderId = rzpResult.razorpayOrderId;
      await client.from("payments").insert({
        order_id: orderRow.id,
        provider: "razorpay",
        provider_order_id: razorpayOrderId,
        amount_paise: pricing.grandTotalPaise,
        currency: "INR",
        status: "created",
      });
    }
  } else {
    // Record payment intent with status pending / unconfigured
    await client.from("payments").insert({
      order_id: orderRow.id,
      provider: "razorpay",
      provider_order_id: `pending_${crypto.randomUUID()}`,
      amount_paise: pricing.grandTotalPaise,
      currency: "INR",
      status: "pending",
    });
  }

  // 6. Clear cart items since they have been committed to this order
  if (cart.id) {
    await client.from("cart_items").delete().eq("cart_id", cart.id);
  }

  const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const checkoutOrder: CheckoutOrder = {
    id: orderRow.id,
    orderNumber: orderRow.order_number || orderNumber,
    status: orderRow.status as CheckoutOrder["status"],
    paymentStatus: orderRow.payment_status as CheckoutOrder["paymentStatus"],
    grandTotalPaise: pricing.grandTotalPaise,
    currency: "INR",
    items: snapshotItems,
    shippingAddress,
    reservationExpiresAt,
    createdAt: orderRow.created_at,
  };

  return {
    success: true,
    order: checkoutOrder,
    gatewayStatus,
    razorpayOrderId,
  };
}
