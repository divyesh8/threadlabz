import { STORE_CONFIG } from './config';
import { CartItem, CartPricingSummary, PromoCode } from '../types/cart';

export const VALID_PROMO_CODES: Record<string, PromoCode> = {
  LAB15: {
    code: 'LAB15',
    description: '15% off on orders above ₹999',
    discountType: 'percentage',
    discountValue: 15,
    minOrderPaise: 99900,
    maxDiscountPaise: 50000, // Max ₹500 discount
  },
  CANVAS20: {
    code: 'CANVAS20',
    description: '20% off on custom apparel orders above ₹1,499',
    discountType: 'percentage',
    discountValue: 20,
    minOrderPaise: 149900,
    maxDiscountPaise: 100000, // Max ₹1,000 discount
  },
  THREAD50: {
    code: 'THREAD50',
    description: 'Flat ₹50 off on orders above ₹499',
    discountType: 'fixed',
    discountValue: 5000, // ₹50 in paise
    minOrderPaise: 49900,
  },
  FREESHIP: {
    code: 'FREESHIP',
    description: 'Free Shipping on any order',
    discountType: 'fixed',
    discountValue: 0,
    minOrderPaise: 0,
  },
};

/**
 * Calculates cart pricing server-side using verified product and customization records.
 * Never trust client prices directly.
 */
export function calculateCartPricing(
  items: CartItem[],
  promoCodeInput?: string,
  shippingMethod: 'standard' | 'express' = 'standard'
): CartPricingSummary {
  // 1. Calculate Items Subtotal
  let itemsSubtotalPaise = 0;
  let customizationTotalPaise = 0;

  for (const item of items) {
    itemsSubtotalPaise += item.unitPricePaise * item.quantity;
    if (item.isCustomized) {
      customizationTotalPaise += (item.customizationFeePaise || 0) * item.quantity;
    }
  }

  const grossMerchandisePaise = itemsSubtotalPaise + customizationTotalPaise;

  // 2. Validate Promo Code
  let discountPaise = 0;
  let appliedPromo: PromoCode | undefined = undefined;

  if (promoCodeInput) {
    const codeKey = promoCodeInput.trim().toUpperCase();
    const candidate = VALID_PROMO_CODES[codeKey];

    if (candidate && grossMerchandisePaise >= candidate.minOrderPaise) {
      appliedPromo = candidate;
      if (candidate.discountType === 'percentage') {
        const rawDiscount = Math.round((grossMerchandisePaise * candidate.discountValue) / 100);
        discountPaise = candidate.maxDiscountPaise
          ? Math.min(rawDiscount, candidate.maxDiscountPaise)
          : rawDiscount;
      } else {
        discountPaise = Math.min(candidate.discountValue, grossMerchandisePaise);
      }
    }
  }

  // 3. Shipping logic
  const isFreePromo = appliedPromo?.code === 'FREESHIP';
  const qualifiesFreeShipping =
    grossMerchandisePaise >= STORE_CONFIG.policies.freeShippingThresholdPaise || isFreePromo;

  let shippingPaise = 0;
  if (items.length > 0) {
    if (shippingMethod === 'express') {
      shippingPaise = STORE_CONFIG.policies.expressShippingFeePaise;
    } else {
      shippingPaise = qualifiesFreeShipping ? 0 : STORE_CONFIG.policies.standardShippingFeePaise;
    }
  }

  // 4. GST Tax (5% included or itemized - calculate 5% on discounted product value)
  const taxableAmountPaise = Math.max(0, grossMerchandisePaise - discountPaise);
  const taxPaise = Math.round((taxableAmountPaise * STORE_CONFIG.policies.gstRatePercentage) / 100);

  // 5. Final Payable
  const totalPayablePaise = Math.max(0, taxableAmountPaise + shippingPaise + taxPaise);

  return {
    itemsSubtotalPaise,
    customizationTotalPaise,
    discountPaise,
    appliedPromo,
    shippingPaise,
    taxPaise,
    totalPayablePaise,
    freeShippingThresholdPaise: STORE_CONFIG.policies.freeShippingThresholdPaise,
    isFreeShipping: shippingPaise === 0 && items.length > 0,
  };
}
