export type SupabaseConfig = { url: string; publishableKey: string };

// Only the new publishable key format is accepted. A legacy service-role JWT
// accidentally pasted into a public variable must never reach createBrowserClient.
export function parseSupabaseConfig(url?: string, key?: string): SupabaseConfig | null {
  if (!url || !key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) return null;
    return { url: parsed.origin, publishableKey: key };
  } catch { return null; }
}

export function getSupabaseConfig() {
  const config = parseSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!config) return null;
  const environment = process.env.NEXT_PUBLIC_APP_ENV || "local";
  const host = new URL(config.url).hostname;
  if (environment === "local" && !["localhost", "127.0.0.1", "[::1]"].includes(host)) return null;
  if (!["local", "staging", "production"].includes(environment)) return null;
  if (environment !== "local" && !/^[a-z]{20}\.supabase\.co$/.test(host)) return null;
  return config;
}
