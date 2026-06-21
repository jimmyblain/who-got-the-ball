"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isSessionMember } from "@/lib/sessions";

/**
 * Schedule a check-in for a session, replacing any existing pending check-in
 * for the same (session, user). One pending check-in per session per user.
 */
export async function scheduleCheckIn(sessionId: string, daysFromNow: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (![3, 7, 14].includes(daysFromNow)) {
    return { error: "Pick a supported reminder window." };
  }

  if (!(await isSessionMember(supabase, sessionId, user.id))) {
    return { error: "You're not part of this session." };
  }

  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + daysFromNow);
  const scheduledFor = scheduled.toISOString().split("T")[0];

  await supabase
    .from("check_ins")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  const { error } = await supabase.from("check_ins").insert({
    session_id: sessionId,
    user_id: user.id,
    scheduled_for: scheduledFor,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Mark a check-in as completed (the user followed up).
 */
export async function completeCheckIn(checkInId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("check_ins")
    .update({ status: "completed" })
    .eq("id", checkInId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Dismiss a check-in (user doesn't want to act on it).
 */
export async function dismissCheckIn(checkInId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("check_ins")
    .update({ status: "dismissed" })
    .eq("id", checkInId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
