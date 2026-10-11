import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Call only after getUser(), never with an ID supplied by a browser form.
export async function ensureProfile(client: SupabaseClient<Database>, verifiedUserId: string) {
  return client.from("profiles").upsert({ id: verifiedUserId }, { onConflict: "id", ignoreDuplicates: true });
}
