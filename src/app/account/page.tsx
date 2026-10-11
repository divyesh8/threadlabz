import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm, SignOutButton } from "@/components/auth/auth-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfig, parseSiteUrl } from "@/lib/supabase/config";
import { safeNext } from "@/lib/auth/validation";
import { ensureProfile } from "@/lib/auth/profile";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your account — ThreadLabz" };
export const dynamic = "force-dynamic";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  const registrationReady = Boolean(parseSiteUrl(process.env.SITE_URL));
  let userEmail: string | null = null;
  let isAdmin = false;
  let unavailable = false;
  let profileUnavailable = false;

  if (configured) {
    try {
      const client = await createServerSupabaseClient();
      const result = await client!.auth.getUser();
      if (result.data.user) {
        userEmail = result.data.user.email ?? "Your verified account";
        const { error } = await ensureProfile(client!, result.data.user.id);
        profileUnavailable = Boolean(error);
        const { data: profile } = await client!
          .from("profiles")
          .select("role")
          .eq("id", result.data.user.id)
          .maybeSingle();
        if (profile?.role === "admin") {
          isAdmin = true;
        }
      } else if (
        result.error &&
        result.error.name !== "AuthSessionMissingError" &&
        result.error.status !== 401 &&
        result.error.status !== 403
      ) {
        unavailable = true;
      }
    } catch {
      unavailable = true;
    }
  }

  const signup = params.mode === "signup";
  const messages: Record<string, string> = {
    confirmation:
      "That confirmation link could not be verified. It may have expired or already been used. Try signing in, or create an account to request a fresh confirmation.",
    unavailable: "Account services are temporarily unavailable. Please try again later.",
    configuration: "Accounts are not available yet. You can still explore the preview.",
    unauthorized: "Administrator privileges are required to access the admin area.",
  };

  return (
    <section className="account-page page-width">
      <p className="eyebrow">Your ThreadLabz</p>
      <h1>{userEmail ? "Good to see you." : signup ? "Make yourself at home." : "A space that’s all yours."}</h1>
      <div className="account-panel">
        {!configured ? (
          <>
            <h2>Accounts open soon.</h2>
            <p>Sign-in is being prepared. Explore the store preview while we finish connecting your account.</p>
            <Button asChild>
              <Link href="/shop">Explore the preview</Link>
            </Button>
          </>
        ) : unavailable ? (
          <>
            <h2>We couldn’t reach your account.</h2>
            <p role="alert">Account services are temporarily unavailable. Your details haven’t been changed.</p>
            <Link href="/account" className="auth-switch">
              Try again
            </Link>
          </>
        ) : userEmail ? (
          <>
            <h2>You’re signed in</h2>
            <p>{userEmail}</p>
            {isAdmin && (
              <div style={{ margin: "1rem 0" }}>
                <p style={{ color: "#a74224", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Administrator Access Granted
                </p>
                <Button asChild style={{ background: "#a74224", color: "#fff" }}>
                  <Link href="/admin">Open Admin Dashboard</Link>
                </Button>
              </div>
            )}
            {profileUnavailable && (
              <p role="alert">Your session is verified, but your profile could not load. Please try again later.</p>
            )}
            <p>Orders, checkout, saved addresses and favourites will open in a later store update.</p>
            <SignOutButton />
          </>
        ) : (
          <>
            {params.error && messages[params.error] && (
              <p className="auth-message field-error" role="alert">
                {messages[params.error]}
              </p>
            )}
            {params.message === "signed-out" && <p role="status">You’re signed out on this device.</p>}
            <h2>{signup ? "Create an account" : "Welcome back"}</h2>
            {signup && !registrationReady ? (
              <p role="status">
                New account registration isn’t open yet.{" "}
                <Link href="/login" className="auth-switch">
                  Back to sign-in
                </Link>
              </p>
            ) : (
              <AuthForm
                key={signup ? "signup" : "signin"}
                mode={signup ? "signup" : "signin"}
                next={safeNext(params.next)}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
