import "server-only";
import { parseSupabaseConfig } from "@/lib/supabase/parse-config";

export function getSupabaseConfig() {
  const config = parseSupabaseConfig(
    process.env.THREADLABZ_SUPABASE_URL,
    process.env.THREADLABZ_SUPABASE_PUBLISHABLE_KEY,
  );
  if (!config) return null;
  const environment = process.env.APP_ENV || "local";
  const host = new URL(config.url).hostname;
  if (environment === "local" && !["localhost", "127.0.0.1", "[::1]"].includes(host)) return null;
  if (!["local", "staging", "production"].includes(environment)) return null;
  if (environment !== "local" && !/^[a-z]{20}\.supabase\.co$/.test(host)) return null;
  return config;
}
