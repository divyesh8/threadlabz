import "server-only";
import { randomUUID } from "node:crypto";
import { commerceRpc, prepareCheckout, type CheckoutContext } from "./repository";
import { getRazorpayGatewayStatus, createRazorpayOrder } from "./payment";
import { shippingAddressSchema } from "../schemas/checkout";
import type { ShippingAddress, CreateOrderResult } from "../types/checkout";

export async function createCheckoutOrder(
  context: CheckoutContext,
  shippingAddress: ShippingAddress,
  options?: { idempotencyKey?: string }
): Promise<CreateOrderResult> {
  const gatewayStatus = getRazorpayGatewayStatus();
  if (!gatewayStatus.isConfigured) {
    return { success: false, error: gatewayStatus.blockerMessage, code: "GATEWAY_UNAVAILABLE" };
  }
  const address = shippingAddressSchema.safeParse(shippingAddress);
  if (!address.success) return { success: false, error: "Invalid delivery address.", code: "VALIDATION_FAILED" };
  try {
    const order = await prepareCheckout(context, address.data, options?.idempotencyKey ?? randomUUID());
    const claim = await commerceRpc("commerce_claim_gateway", { p_order_id: order.id }) as {
      claimed: boolean; providerOrderId?: string;
    };
    let razorpayOrderId = claim.providerOrderId;
    if (claim.claimed) {
      const result = await createRazorpayOrder({ orderId: order.id, amountPaise: order.grandTotalPaise });
      if (!result.success || !result.razorpayOrderId) {
        return { success: false, error: "Payment setup needs reconciliation. Your order is saved; please contact support before retrying payment.", code: "GATEWAY_UNAVAILABLE" };
      }
      razorpayOrderId = result.razorpayOrderId;
      await commerceRpc("commerce_attach_gateway", {
        p_order_id: order.id, p_provider_id: razorpayOrderId,
        p_amount: order.grandTotalPaise, p_currency: order.currency,
      });
    }
    if (!razorpayOrderId) {
      return { success: false, error: "Payment setup is pending verification. Please retry shortly or contact support.", code: "GATEWAY_UNAVAILABLE" };
    }
    return { success: true, order, gatewayStatus, razorpayOrderId };
  } catch {
    return {
      success: false,
      error: "Checkout could not complete. Check your bag and retry the same request; contact support if payment setup remains pending.",
      code: "VALIDATION_FAILED",
    };
  }
}
