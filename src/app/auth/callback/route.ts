import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/validation";
import { ensureProfile } from "@/lib/auth/profile";
import { parseSiteUrl } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let path = "/account?error=confirmation";
  if (code && code.length <= 2048) {
    try {
      const client = await createServerSupabaseClient();
      if (!client) path = "/account?error=configuration";
      else {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (!error) {
          const { data, error: verificationError } = await client.auth.getUser();
          if (!verificationError && data.user) {
            await ensureProfile(client, data.user.id);
            path = safeNext(request.nextUrl.searchParams.get("next"));
          }
        }
      }
    } catch { path = "/account?error=unavailable"; }
  }
  // Construct a fresh URL so the auth code is never propagated to the next page.
  const response = NextResponse.redirect(new URL(path, parseSiteUrl(process.env.SITE_URL) ?? request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
