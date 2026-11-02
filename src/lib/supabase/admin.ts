import "server-only";
import { createAdminClient } from "@supabase/server/core";
import type { Database } from "@/types/database";
import { assertRuntimeConfiguration } from "@/lib/config/runtime";
import { getSupabaseConfig } from "@/lib/supabase/config";

export function createAdminSupabaseClient() {
  assertRuntimeConfiguration();
  const config = getSupabaseConfig();
  const secretKey = process.env.THREADLABZ_SUPABASE_SECRET_KEY;

  if (!config || !secretKey) {
    throw new Error(
      "Missing ThreadLabz Supabase admin configuration."
    );
  }

  return createAdminClient<Database>({
    env: {
      url: config.url,
      secretKeys: { default: secretKey },
    },
    supabaseOptions: {
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }),
      },
    },
  });
}
