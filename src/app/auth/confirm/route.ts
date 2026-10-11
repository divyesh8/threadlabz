import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/features/auth/services/profile";
import { parseSiteUrl } from "@/lib/config/site";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let path = "/account?error=confirmation";
  // Only account confirmation is enabled. Recovery/email-change flows need their own UI.
  if (tokenHash && /^[a-f0-9]{32,256}$/i.test(tokenHash) && type === "email") {
    try {
      const client = await createServerSupabaseClient();
      if (!client) path = "/account?error=configuration";
      else {
        const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
        if (!error) {
          const { data, error: verificationError } = await client.auth.getUser();
          if (!verificationError && data.user) {
            await ensureProfile(client, data.user.id);
            path = "/account";
          }
        }
      }
    } catch { path = "/account?error=unavailable"; }
  }
  const response = NextResponse.redirect(new URL(path, parseSiteUrl(process.env.SITE_URL) ?? request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
