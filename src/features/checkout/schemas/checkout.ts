import { z } from "zod";

export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  addressLine1: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address line 1 cannot exceed 200 characters"),
  addressLine2: z
    .string()
    .trim()
    .max(200, "Address line 2 cannot exceed 200 characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(100, "City cannot exceed 100 characters"),
  state: z
    .string()
    .trim()
    .min(2, "State must be at least 2 characters")
    .max(100, "State cannot exceed 100 characters"),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Please enter a valid 6-digit Indian PIN code"),
  country: z.literal("IN").default("IN"),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

export const initiateCheckoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  idempotencyKey: z.string().uuid().optional(),
});

export type InitiateCheckoutInput = z.infer<typeof initiateCheckoutSchema>;

export const paymentCallbackSchema = z.object({
  orderId: z.string().uuid(),
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict();
export type PaymentCallbackInput = z.infer<typeof paymentCallbackSchema>;
