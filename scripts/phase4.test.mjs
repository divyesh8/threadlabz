import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { calculateOrderPricing } from "../src/features/checkout/services/pricing.ts";
import { addToCartSchema, updateQuantitySchema } from "../src/features/cart/schemas/cart.ts";
import { shippingAddressSchema } from "../src/features/checkout/schemas/checkout.ts";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
  getRazorpayGatewayStatus,
} from "../src/features/checkout/services/signatures.ts";

test("pricing engine computes strict integer paise without floating point inaccuracy", () => {
  const items = [
    { unitPricePaise: 79900, quantity: 2 }, // ₹799 × 2 = ₹1598 (159800 paise)
    { unitPricePaise: 129900, quantity: 1 }, // ₹1299 × 1 = ₹1299 (129900 paise)
  ];

  const pricing = calculateOrderPricing(items, {
    shippingPaise: 0,
    taxRateBps: 500, // 5% inclusive GST
    isTaxInclusive: true,
  });

  assert.equal(pricing.subtotalPaise, 289700); // 159800 + 129900 = 289700 paise
  assert.equal(pricing.shippingPaise, 0);
  assert.equal(pricing.discountPaise, 0);
  assert.equal(pricing.grandTotalPaise, 289700);
  assert.equal(Number.isInteger(pricing.subtotalPaise), true);
  assert.equal(Number.isInteger(pricing.grandTotalPaise), true);

  // 5% inclusive GST: round((289700 * 500) / 10500) = round(13795.238) = 13795 paise
  assert.equal(pricing.taxPaise, 13795);
  assert.equal(Number.isInteger(pricing.taxPaise), true);
});

test("pricing clamps discounts and shipping securely to prevent negative totals", () => {
  const items = [{ unitPricePaise: 50000, quantity: 1 }]; // ₹500 (50000 paise)

  // Test discount exceeding subtotal
  const overDiscount = calculateOrderPricing(items, {
    discountPaise: 999999,
    shippingPaise: 10000,
  });
  assert.equal(overDiscount.discountPaise, 50000); // Clamped to subtotal
  assert.equal(overDiscount.grandTotalPaise, 10000); // Only shipping remains

  // Empty cart
  const empty = calculateOrderPricing([]);
  assert.equal(empty.subtotalPaise, 0);
  assert.equal(empty.grandTotalPaise, 0);
  assert.equal(empty.taxPaise, 0);
});

test("cart validation schemas reject unsafe bounds and invalid types", () => {
  // Add to cart: quantity must be 1..10
  assert.equal(addToCartSchema.safeParse({ variantId: "123e4567-e89b-12d3-a456-426614174000", quantity: 1 }).success, true);
  assert.equal(addToCartSchema.safeParse({ variantId: "123e4567-e89b-12d3-a456-426614174000", quantity: 0 }).success, false);
  assert.equal(addToCartSchema.safeParse({ variantId: "123e4567-e89b-12d3-a456-426614174000", quantity: 11 }).success, false);
  assert.equal(addToCartSchema.safeParse({ variantId: "123e4567-e89b-12d3-a456-426614174000", quantity: 2.5 }).success, false);
  assert.equal(addToCartSchema.safeParse({ variantId: "not-a-uuid", quantity: 1 }).success, false);

  // Update quantity: 0..10
  assert.equal(updateQuantitySchema.safeParse({ itemId: "123e4567-e89b-12d3-a456-426614174000", quantity: 0 }).success, true);
  assert.equal(updateQuantitySchema.safeParse({ itemId: "123e4567-e89b-12d3-a456-426614174000", quantity: 10 }).success, true);
  assert.equal(updateQuantitySchema.safeParse({ itemId: "123e4567-e89b-12d3-a456-426614174000", quantity: -1 }).success, false);
  assert.equal(updateQuantitySchema.safeParse({ itemId: "123e4567-e89b-12d3-a456-426614174000", quantity: 11 }).success, false);
});

test("shipping address schema enforces Indian phone and PIN code standards", () => {
  const valid = {
    fullName: "Aarav Sharma",
    phone: "9876543210",
    addressLine1: "Flat 402, Lotus Towers, MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    country: "IN",
  };
  assert.equal(shippingAddressSchema.safeParse(valid).success, true);

  // Invalid phone numbers
  assert.equal(shippingAddressSchema.safeParse({ ...valid, phone: "1234567890" }).success, false); // Doesn't start with 6-9
  assert.equal(shippingAddressSchema.safeParse({ ...valid, phone: "987654321" }).success, false);  // 9 digits
  assert.equal(shippingAddressSchema.safeParse({ ...valid, phone: "+919876543210" }).success, false); // Contains +91

  // Invalid postal codes
  assert.equal(shippingAddressSchema.safeParse({ ...valid, postalCode: "56001" }).success, false); // 5 digits
  assert.equal(shippingAddressSchema.safeParse({ ...valid, postalCode: "5600012" }).success, false); // 7 digits
  assert.equal(shippingAddressSchema.safeParse({ ...valid, postalCode: "ABCDEF" }).success, false);

  // Address length
  assert.equal(shippingAddressSchema.safeParse({ ...valid, addressLine1: "Home" }).success, false); // Too short
});

test("razorpay payment signature verification matches official HMAC-SHA256 algorithm", () => {
  const testSecret = "test_secret_key_123456789";
  const orderId = "order_DBJOWzybf0sJbb";
  const paymentId = "pay_29QQoUBi66xm2f";

  // Generate valid signature using official algorithm: HMAC-SHA256(order_id + "|" + payment_id, secret)
  const payload = `${orderId}|${paymentId}`;
  const validSignature = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

  // Verification succeeds with matching secret and signature
  assert.equal(
    verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
      secret: testSecret,
    }),
    true
  );

  // Tampered payment ID fails
  assert.equal(
    verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: "pay_tampered_fake_id",
      razorpaySignature: validSignature,
      secret: testSecret,
    }),
    false
  );

  // Tampered signature fails
  assert.equal(
    verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature.replace(/.$/, "0"),
      secret: testSecret,
    }),
    false
  );

  // Missing secret fails safely without throwing
  assert.equal(
    verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
      secret: "",
    }),
    false
  );
});

test("webhook signature verification validates exact raw request payload", () => {
  const webhookSecret = "webhook_secret_987654321";
  const rawBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_test_123",
          order_id: "order_test_456",
          amount: 159800,
          status: "captured",
        },
      },
    },
  });

  const validSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  assert.equal(
    verifyWebhookSignature({
      rawBody,
      signature: validSignature,
      secret: webhookSecret,
    }),
    true
  );

  // Even 1 space or altered character fails verification
  const alteredBody = rawBody + " ";
  assert.equal(
    verifyWebhookSignature({
      rawBody: alteredBody,
      signature: validSignature,
      secret: webhookSecret,
    }),
    false
  );
});

test("gateway configuration accurately reports unconfigured state when keys are absent", () => {
  // In our local environment, RAZORPAY_KEY_ID is not configured
  const status = getRazorpayGatewayStatus();
  assert.equal(status.isConfigured, false);
  assert.equal(status.mode, "unconfigured");
  assert.ok(status.blockerMessage.includes("RAZORPAY_KEY_ID"));
});
