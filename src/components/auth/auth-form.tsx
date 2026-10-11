"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, signUp, signOut, requestPasswordReset, updatePassword } from "@/app/account/actions";
import {
  signInSchema,
  signUpSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  type AuthInput,
  type ResetPasswordInput,
  type UpdatePasswordInput,
  type AuthResult,
} from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const [result, setResult] = useState<AuthResult>({});
  const [googlePending, setGooglePending] = useState(false);
  const [pending, startTransition] = useTransition();
  const signup = mode === "signup";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthInput>({ resolver: zodResolver(signup ? signUpSchema : signInSchema) });

  async function handleGoogleSignIn() {
    setResult({});
    setGooglePending(true);
    try {
      const client = createBrowserSupabaseClient();
      if (!client) {
        setResult({ error: "Authentication service is not configured yet." });
        setGooglePending(false);
        return;
      }
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setResult({
          error:
            error.message.includes("not enabled") || error.message.includes("provider")
              ? "Google sign-in is not configured yet on this project. Please use email and password."
              : error.message,
        });
      }
    } catch {
      setResult({ error: "Google sign-in is temporarily unavailable. Please use email and password." });
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <form
      className="auth-form"
      noValidate
      onSubmit={handleSubmit((input) => {
        setResult({});
        startTransition(async () => {
          try {
            setResult(signup ? await signUp(input) : await signIn(input, next));
          } catch {
            setResult({ error: "This request couldn’t be completed. Please try again." });
          }
        });
      })}
      aria-busy={pending || googlePending}
    >
      <div>
        <label htmlFor="auth-email">Email address</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          {...register("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="field-error">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label htmlFor="auth-password">Password</label>
          {!signup && (
            <Link
              href="/auth/forgot-password"
              className="text-xs text-stone-500 hover:text-stone-800 underline"
              style={{ fontSize: "0.8125rem", color: "var(--muted-foreground, #666)" }}
            >
              Forgot password?
            </Link>
          )}
        </div>
        <input
          id="auth-password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          maxLength={128}
          {...register("password")}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : signup ? "password-hint" : undefined}
        />
        {signup && (
          <p id="password-hint" className="field-hint">
            Use 12–128 characters. A long, unique passphrase works well.
          </p>
        )}
        {errors.password && (
          <p id="password-error" className="field-error">
            {errors.password.message}
          </p>
        )}
      </div>

      {result.error && (
        <p className="auth-message field-error" role="alert">
          {result.error}
        </p>
      )}
      {result.message && (
        <p className="auth-message" role="status">
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={pending || googlePending}>
        {pending ? "Please wait…" : signup ? "Create account" : "Sign in"}
      </Button>

      <div style={{ position: "relative", textAlign: "center", margin: "1rem 0" }}>
        <hr style={{ border: 0, borderTop: "1px solid #e5e5e5" }} />
        <span
          style={{
            position: "absolute",
            top: "-0.65rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            padding: "0 0.5rem",
            fontSize: "0.75rem",
            color: "#888",
          }}
        >
          OR
        </span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={pending || googlePending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          padding: "0.625rem 1rem",
          borderRadius: "9999px",
          border: "1px solid #d1d5db",
          background: "#fff",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        {googlePending ? "Connecting to Google…" : "Continue with Google"}
      </button>

      <Link
        className="auth-switch"
        href={
          signup
            ? `/login?next=${encodeURIComponent(next)}`
            : `/signup?next=${encodeURIComponent(next)}`
        }
      >
        {signup ? "Already registered? Sign in" : "New here? Create an account"}
      </Link>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [result, setResult] = useState<AuthResult>({});
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  return (
    <form
      className="auth-form"
      noValidate
      onSubmit={handleSubmit((input) => {
        setResult({});
        startTransition(async () => {
          try {
            setResult(await requestPasswordReset(input.email));
          } catch {
            setResult({ error: "Could not send reset link. Please try again later." });
          }
        });
      })}
      aria-busy={pending}
    >
      <div>
        <label htmlFor="reset-email">Email address</label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          {...register("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "reset-email-error" : undefined}
        />
        {errors.email && (
          <p id="reset-email-error" className="field-error">
            {errors.email.message}
          </p>
        )}
      </div>

      {result.error && (
        <p className="auth-message field-error" role="alert">
          {result.error}
        </p>
      )}
      {result.message && (
        <p className="auth-message" role="status">
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Sending link…" : "Send reset link"}
      </Button>

      <Link className="auth-switch" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const [result, setResult] = useState<AuthResult>({});
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) });

  return (
    <form
      className="auth-form"
      noValidate
      onSubmit={handleSubmit((input) => {
        setResult({});
        startTransition(async () => {
          try {
            setResult(await updatePassword(input.password));
          } catch {
            setResult({ error: "Could not update password. Please try again." });
          }
        });
      })}
      aria-busy={pending}
    >
      <div>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          {...register("password")}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "new-password-error" : undefined}
        />
        {errors.password && (
          <p id="new-password-error" className="field-error">
            {errors.password.message}
          </p>
        )}
      </div>

      {result.error && (
        <p className="auth-message field-error" role="alert">
          {result.error}
        </p>
      )}
      {result.message && (
        <p className="auth-message" role="status">
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>

      <Link className="auth-switch" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult>({});
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              setResult(await signOut());
            } catch {
              setResult({ error: "Couldn’t sign out. Please try again." });
            }
          })
        }
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {result.error && (
        <p role="alert" className="field-error">
          {result.error}
        </p>
      )}
    </div>
  );
}
