"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_DISPLAY_NAME = 60;

/**
 * Update the current user's profile.
 * For now, just `display_name`. Trims whitespace; rejects empty values.
 */
export async function updateProfile(input: { displayName: string }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = input.displayName.trim();
  if (trimmed.length === 0) return { error: "Name can't be empty." };
  if (trimmed.length > MAX_DISPLAY_NAME) {
    return { error: `Keep it under ${MAX_DISPLAY_NAME} characters.` };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/partner");

  return { success: true };
}
