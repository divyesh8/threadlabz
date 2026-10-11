import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Forgot Password — ThreadLabz",
  description: "Reset your ThreadLabz account password.",
};

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <section className="account-page page-width">
      <p className="eyebrow">Account Recovery</p>
      <h1>Reset password</h1>
      <div className="account-panel">
        <p className="field-hint" style={{ marginBottom: "1.5rem" }}>
          Enter the email address associated with your ThreadLabz account and we’ll send you a link to reset your password.
        </p>
        <ForgotPasswordForm />
      </div>
    </section>
  );
}
