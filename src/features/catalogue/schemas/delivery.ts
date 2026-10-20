import { z } from "zod";

const policy = z.object({
  summary: z.string().trim().min(1).max(3000),
  url: z.url().refine(url => new URL(url).protocol === "https:", "Policy links must use HTTPS").optional(),
}).strict();

export const shoppingPoliciesSchema = z.object({
  delivery: policy.optional(),
  returns: policy.optional(),
}).strict();

export type ShoppingPolicies = z.infer<typeof shoppingPoliciesSchema>;
export const pinCodeSchema = z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid six-digit Indian PIN code");

export function readShoppingPolicies(value: string | undefined): ShoppingPolicies {
  try {
    const result = shoppingPoliciesSchema.safeParse(JSON.parse(value || "{}"));
    return result.success ? result.data : {};
  } catch { return {}; }
}
