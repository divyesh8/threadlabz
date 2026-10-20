import "server-only";
import { pinCodeSchema, readShoppingPolicies } from "../schemas/delivery";

export function getShoppingPolicies() {
  return readShoppingPolicies(process.env.SHOPPING_POLICIES_JSON);
}

export type ServiceabilityResult =
  | { status: "not-configured" | "unavailable" | "invalid" }
  | { status: "serviceable" | "not-serviceable"; message: string };

// Future courier integrations implement this server-only boundary. No PINs are
// collected, stored or sent until an actual provider is connected.
export interface ServiceabilityProvider {
  check(input: { pinCode: string; productId: string; variantId?: string }): Promise<Exclude<ServiceabilityResult, { status: "not-configured" | "unavailable" | "invalid" }>>;
}

export async function checkServiceability(
  input: { pinCode: string; productId: string; variantId?: string },
  provider?: ServiceabilityProvider,
): Promise<ServiceabilityResult> {
  if (!pinCodeSchema.safeParse(input.pinCode).success) return { status: "invalid" };
  if (!provider) return { status: "not-configured" };
  try { return await provider.check(input); }
  catch { return { status: "unavailable" }; }
}
