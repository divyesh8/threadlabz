export function parseSiteUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return url.protocol === "https:" || (local && url.protocol === "http:") ? url.origin : null;
  } catch { return null; }
}
