"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, signUp, signOut } from "@/app/account/actions";
import { signInSchema, signUpSchema, type AuthInput, type AuthResult } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const [result, setResult] = useState<AuthResult>({});
  const [pending, startTransition] = useTransition();
  const signup = mode === "signup";
  const { register, handleSubmit, formState: { errors } } = useForm<AuthInput>({ resolver: zodResolver(signup ? signUpSchema : signInSchema) });
  return <form className="auth-form" noValidate onSubmit={handleSubmit(input => {
    setResult({});
    startTransition(async () => {
      try { setResult(signup ? await signUp(input) : await signIn(input, next)); }
      catch { setResult({ error: "This request couldn’t be completed. Please try again." }); }
    });
  })} aria-busy={pending}>
    <div><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" maxLength={254} {...register("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <p id="email-error" className="field-error">{errors.email.message}</p>}</div>
    <div><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={signup ? "new-password" : "current-password"} maxLength={128} {...register("password")} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : signup ? "password-hint" : undefined} />{signup && <p id="password-hint" className="field-hint">Use 12–128 characters. A long, unique passphrase works well.</p>}{errors.password && <p id="password-error" className="field-error">{errors.password.message}</p>}</div>
    {result.error && <p className="auth-message field-error" role="alert">{result.error}</p>}
    {result.message && <p className="auth-message" role="status">{result.message}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Please wait…" : signup ? "Create account" : "Sign in"}</Button>
    <Link className="auth-switch" href={signup ? `/account?next=${encodeURIComponent(next)}` : `/account?mode=signup&next=${encodeURIComponent(next)}`}>{signup ? "Already registered? Sign in" : "New here? Create an account"}</Link>
    <p className="field-hint">Accounts are for your ThreadLabz profile. Orders, checkout and saved favourites aren’t available yet.</p>
  </form>;
}

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult>({});
  return <div><Button disabled={pending} onClick={() => startTransition(async () => {
    try { setResult(await signOut()); } catch { setResult({ error: "Couldn’t sign out. Please try again." }); }
  })}>{pending ? "Signing out…" : "Sign out"}</Button>{result.error && <p role="alert" className="field-error">{result.error}</p>}</div>;
}
