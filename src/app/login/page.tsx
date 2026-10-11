import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/lib/auth/validation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in — ThreadLabz",
  description: "Sign in to your ThreadLabz account.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  const next = safeNext(params.next);

  return (
    <section className="account-page page-width">
      <p className="eyebrow">ThreadLabz Account</p>
      <h1>Welcome back</h1>
      <div className="account-panel">
        {!configured ? (
          <>
            <h2>Accounts opening soon</h2>
            <p>Authentication is being configured. You can explore the store preview in the meantime.</p>
            <Button asChild>
              <Link href="/shop">Explore the store</Link>
            </Button>
          </>
        ) : (
          <>
            {params.message === "signed-out" && (
              <p role="status" className="auth-message">
                You’ve signed out successfully.
              </p>
            )}
            {params.error === "unauthorized" && (
              <p role="alert" className="auth-message field-error">
                You must have an administrator account to view that page.
              </p>
            )}
            <AuthForm mode="signin" next={next} />
          </>
        )}
      </div>
    </section>
  );
}
