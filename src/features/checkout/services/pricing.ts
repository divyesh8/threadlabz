import type { OrderPricingSummary } from "../types/checkout";

export type PricingItem = {
  unitPricePaise: number;
  quantity: number;
};

export type PricingOptions = {
  shippingPaise?: number;
  discountPaise?: number;
  taxRateBps?: number; // Basis points (e.g., 500 = 5% GST, 1200 = 12% GST)
  isTaxInclusive?: boolean; // In India, retail clothing MRP is inclusive of GST
};

/**
 * Server-authoritative integer-paise order pricing engine.
 * Never performs floating point calculations on money.
 */
export function calculateOrderPricing(
  items: PricingItem[],
  options: PricingOptions = {}
): OrderPricingSummary {
  const isTaxInclusive = options.isTaxInclusive ?? true;
  const taxRateBps = Math.max(0, Math.round(options.taxRateBps ?? 500)); // Default 5% GST
  const rawShipping = Math.max(0, Math.round(options.shippingPaise ?? 0));
  const rawDiscount = Math.max(0, Math.round(options.discountPaise ?? 0));

  let subtotalPaise = 0;

  for (const item of items) {
    const safeUnitPrice = Math.max(0, Math.round(item.unitPricePaise));
    const safeQty = Math.max(0, Math.round(item.quantity));
    subtotalPaise += safeUnitPrice * safeQty;
  }

  // Ensure discount does not exceed subtotal
  const discountPaise = Math.min(rawDiscount, subtotalPaise);
  const discountedSubtotal = subtotalPaise - discountPaise;

  let taxPaise = 0;
  let grandTotalPaise = 0;

  if (isTaxInclusive) {
    // In inclusive pricing: MRP includes GST.
    // tax = amount - amount / (1 + rate) = Math.round((amount * rate) / (10000 + rate))
    if (taxRateBps > 0 && discountedSubtotal > 0) {
      taxPaise = Math.round((discountedSubtotal * taxRateBps) / (10000 + taxRateBps));
    }
    grandTotalPaise = discountedSubtotal + rawShipping;
  } else {
    // In exclusive pricing: GST is added on top of subtotal.
    if (taxRateBps > 0 && discountedSubtotal > 0) {
      taxPaise = Math.round((discountedSubtotal * taxRateBps) / 10000);
    }
    grandTotalPaise = discountedSubtotal + rawShipping + taxPaise;
  }

  return {
    subtotalPaise,
    shippingPaise: rawShipping,
    taxPaise,
    discountPaise,
    grandTotalPaise: Math.max(0, grandTotalPaise),
    currency: "INR",
  };
}
