import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/database.types";
import type { User } from "@supabase/supabase-js";

export async function getUser(): Promise<User | null> {
  try {
    const client = await createServerSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;
  try {
    const client = await createServerSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const client = await createServerSupabaseClient();
  if (!client) {
    redirect("/login?next=" + encodeURIComponent("/admin"));
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    redirect("/login?next=" + encodeURIComponent("/admin"));
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/account?error=unauthorized");
  }

  return { user: data.user, profile };
}
