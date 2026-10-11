"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createBrowserSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createBrowserClient<Database>(config.url, config.publishableKey);
}
