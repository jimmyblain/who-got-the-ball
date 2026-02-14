"use server";

/**
 * Server Actions for managing answers.
 * "use server" means these functions run on the server, not in the browser.
 * This keeps our database queries secure — users can't see or tamper with them.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AnswerValue } from "@/lib/types";

/**
 * Save (or update) a user's answer to a question.
 * Uses "upsert" which means: insert if new, update if exists.
 * Think of it like a "save" button that works whether it's your first time or not.
 */
export async function upsertAnswer(questionId: string, answer: AnswerValue) {
  const supabase = await createClient();

  // Get the currently logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Upsert = "insert or update" — if the user already answered this question,
  // it updates their answer instead of creating a duplicate
  const { error } = await supabase.from("answers").upsert(
    {
      user_id: user.id,
      question_id: questionId,
      answer,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,question_id", // the combo that must be unique
    }
  );

  if (error) return { error: error.message };

  // Cancel any pending transfers for this question when the user manually changes their answer.
  // This prevents confusing situations where a transfer is pending but the answer already changed.
  await supabase
    .from("transfers")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("question_id", questionId)
    .eq("status", "pending")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

  // Tell Next.js to refresh the page data so the UI updates
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return { success: true };
}

/**
 * Mark onboarding as complete for the current user.
 * Called when they finish answering all the questions.
 */
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
