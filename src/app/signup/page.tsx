import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/lib/auth/validation";
import { getSupabaseConfig, parseSiteUrl } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Create an Account — ThreadLabz",
  description: "Create your ThreadLabz account to make your mark.",
};

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  const registrationReady = Boolean(parseSiteUrl(process.env.SITE_URL));
  const next = safeNext(params.next);

  return (
    <section className="account-page page-width">
      <p className="eyebrow">ThreadLabz Account</p>
      <h1>Make your mark</h1>
      <div className="account-panel">
        {!configured ? (
          <>
            <h2>Registration opens soon</h2>
            <p>Authentication is being configured. You can explore the store preview in the meantime.</p>
            <Button asChild>
              <Link href="/shop">Explore the store</Link>
            </Button>
          </>
        ) : !registrationReady ? (
          <>
            <h2>Registration temporarily paused</h2>
            <p>New account registration is being finalized. Please sign in if you already have an account.</p>
            <Button asChild>
              <Link href="/login">Go to Sign in</Link>
            </Button>
          </>
        ) : (
          <AuthForm mode="signup" next={next} />
        )}
      </div>
    </section>
  );
}
