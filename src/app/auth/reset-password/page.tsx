import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Set New Password — ThreadLabz",
  description: "Set a new password for your ThreadLabz account.",
};

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <section className="account-page page-width">
      <p className="eyebrow">Account Security</p>
      <h1>New password</h1>
      <div className="account-panel">
        <p className="field-hint" style={{ marginBottom: "1.5rem" }}>
          Choose a secure passphrase of 12–128 characters for your account.
        </p>
        <ResetPasswordForm />
      </div>
    </section>
  );
}
