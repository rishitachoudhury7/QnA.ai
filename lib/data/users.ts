import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/types/database";

export async function ensureCurrentUser(): Promise<User> {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Authentication required");

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        clerk_user_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
        avatar_url: clerkUser.imageUrl ?? null,
      },
      { onConflict: "clerk_user_id" },
    )
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST205") {
      throw new Error("Supabase Phase 1 schema is not applied. Run supabase/migrations/001_initial_learning_schema.sql in the configured Supabase project's SQL Editor.");
    }
    throw new Error(`Could not sync user: ${error.message}`);
  }
  return data as User;
}