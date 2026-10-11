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
  return parseSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function parseSiteUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.protocol === "https:" || (local && url.protocol === "http:") ? url.origin : null;
  } catch { return null; }
}
