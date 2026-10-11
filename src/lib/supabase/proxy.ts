import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const authCacheHeaders = new Headers();
  const config = getSupabaseConfig();
  if (config) {
    const supabase = createServerClient<Database>(config.url, config.publishableKey, {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          previousCookies.forEach(cookie => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => authCacheHeaders.set(key, value));
          authCacheHeaders.forEach((value, key) => response.headers.set(key, value));
        },
      },
    });
    try { await supabase.auth.getClaims(); } catch { /* The account page fails closed via getUser(). */ }
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
