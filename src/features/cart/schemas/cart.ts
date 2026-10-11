import { z } from "zod";

export const variantIdSchema = z.string().uuid({ message: "Invalid product variant ID" });
export const cartItemIdSchema = z.string().uuid({ message: "Invalid cart item ID" });

export const addToCartSchema = z.object({
  variantId: variantIdSchema,
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(10, "Maximum quantity per item is 10").default(1),
});

export const updateQuantitySchema = z.object({
  itemId: cartItemIdSchema,
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative").max(10, "Maximum quantity per item is 10"),
});

export const removeItemSchema = z.object({
  itemId: cartItemIdSchema,
});

export const guestSessionTokenSchema = z.string().uuid();

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>;
export type RemoveItemInput = z.infer<typeof removeItemSchema>;
