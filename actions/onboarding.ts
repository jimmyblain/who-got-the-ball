"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeOnboarding() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
