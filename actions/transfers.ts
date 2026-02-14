"use server";

/**
 * Server Actions for "Pass the Ball" transfers.
 * A transfer is when you request your partner to take over a responsibility.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Request to pass a ball (responsibility) to your partner.
 * Creates a pending transfer that the partner can accept or decline.
 */
export async function requestTransfer(
  questionId: string,
  message?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the user's partner
  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (!profile?.partner_id) {
    return { error: "You need a partner to pass the ball!" };
  }

  // Check there's no pending transfer for this question already
  const { data: existing } = await supabase
    .from("transfers")
    .select("id")
    .eq("question_id", questionId)
    .eq("status", "pending")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "There's already a pending transfer for this question." };
  }

  // Create the transfer request
  const { error } = await supabase.from("transfers").insert({
    from_user_id: user.id,
    to_user_id: profile.partner_id,
    question_id: questionId,
    status: "pending",
    message: message || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/transfers");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * Accept a transfer — take on the responsibility your partner is passing to you.
 * This automatically updates both users' answers.
 */
export async function acceptTransfer(transferId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the transfer details
  const { data: transfer, error: fetchError } = await supabase
    .from("transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (fetchError || !transfer) return { error: "Transfer not found" };
  if (transfer.to_user_id !== user.id) return { error: "This transfer isn't for you" };
  if (transfer.status !== "pending") return { error: "This transfer is no longer pending" };

  // Update the transfer status to accepted
  await supabase
    .from("transfers")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", transferId);

  // Update the sender's answer: they no longer own this ball → it's now their partner's
  await supabase.from("answers").upsert(
    {
      user_id: transfer.from_user_id,
      question_id: transfer.question_id,
      answer: "partner",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" }
  );

  // Update the receiver's answer: they now own this ball
  await supabase.from("answers").upsert(
    {
      user_id: transfer.to_user_id,
      question_id: transfer.question_id,
      answer: "mine",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" }
  );

  revalidatePath("/transfers");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * Decline a transfer — refuse to take on the responsibility.
 */
export async function declineTransfer(transferId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: transfer } = await supabase
    .from("transfers")
    .select("to_user_id, status")
    .eq("id", transferId)
    .single();

  if (!transfer) return { error: "Transfer not found" };
  if (transfer.to_user_id !== user.id) return { error: "This transfer isn't for you" };
  if (transfer.status !== "pending") return { error: "This transfer is no longer pending" };

  await supabase
    .from("transfers")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", transferId);

  revalidatePath("/transfers");
  revalidatePath("/dashboard");

  return { success: true };
}
