import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

// Deliberately cookieless: even a signed-in admin sees only published data in
// the public storefront, and cannot use the image route to reveal a draft.
export function createPublicSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
}
