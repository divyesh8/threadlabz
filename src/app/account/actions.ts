"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseSiteUrl } from "@/lib/supabase/config";
import {
  signInSchema,
  signUpSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  safeNext,
  type AuthInput,
  type AuthResult,
} from "@/lib/auth/validation";
import { ensureProfile } from "@/lib/auth/profile";

export async function signIn(input: AuthInput, next: string): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email and password." };
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { error: "Account sign-in is not available yet." };
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error) return { error: "We couldn’t sign you in. Check your details and confirm your email, or try again later." };
    const { data, error: verificationError } = await client.auth.getUser();
    if (verificationError || !data.user) return { error: "We couldn’t verify your session. Please try signing in again." };
    const { error: profileError } = await ensureProfile(client, data.user.id);
    if (profileError) return { error: "You’re signed in, but your account details could not load. Please retry." };
  } catch {
    return { error: "Account services are temporarily unavailable. Please try again later." };
  }
  revalidatePath("/account");
  redirect(safeNext(next));
}

export async function signUp(input: AuthInput): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email and a password of 12–128 characters." };
  const siteUrl = parseSiteUrl(process.env.SITE_URL);
  if (!siteUrl) return { error: "Account registration is not available yet." };
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { error: "Account registration is not available yet." };
    const { data, error } = await client.auth.signUp({
      ...parsed.data,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) return { error: "We couldn’t process this request. Please try again later or sign in if you already have an account." };
    if (data.session) {
      await client.auth.signOut({ scope: "local" });
      return { message: "Your request was processed. You can now try signing in." };
    }
    return { message: "If this email can be registered, you’ll receive a confirmation link. Check your inbox, then return to sign in." };
  } catch {
    return { error: "Account services are temporarily unavailable. Please try again later." };
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { error: "Account services are not configured." };
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return { error: "We couldn’t finish signing out. Please try again." };
  } catch {
    return { error: "We couldn’t finish signing out. Please try again." };
  }
  revalidatePath("/account");
  redirect("/account?message=signed-out");
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse({ email });
  if (!parsed.success) return { error: "Enter a valid email address." };
  const siteUrl = parseSiteUrl(process.env.SITE_URL);
  if (!siteUrl) return { error: "Password reset is not available yet." };
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { error: "Password reset is not available yet." };
    const { error } = await client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    });
    if (error) return { error: "Could not send reset instructions. Please try again." };
    return { message: "If that email is registered, we have sent instructions to reset your password." };
  } catch {
    return { error: "Account services are temporarily unavailable." };
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const parsed = updatePasswordSchema.safeParse({ password });
  if (!parsed.success) return { error: "Password must be 12–128 characters long." };
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { error: "Account services are not configured." };
    const { error } = await client.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: "Could not update your password. Please try again." };
    return { message: "Your password has been updated successfully." };
  } catch {
    return { error: "Account services are temporarily unavailable." };
  }
}
