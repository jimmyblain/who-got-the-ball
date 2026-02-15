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
 *
 * Uses a SECURITY DEFINER database function (accept_transfer) so that
 * both users' answers can be updated in one atomic operation.
 * Without this, RLS would block the receiver from updating the sender's answer
 * (because RLS says "you can only update YOUR OWN answers").
 */
export async function acceptTransfer(transferId: string) {
  const supabase = await createClient();

  // Call the database function that handles everything:
  // - Validates the transfer (exists, pending, belongs to current user)
  // - Marks it as accepted
  // - Updates BOTH users' answers (sender → "partner", receiver → "mine")
  // The function runs as SECURITY DEFINER so it bypasses RLS for the answer updates.
  const { data, error } = await supabase.rpc("accept_transfer", {
    transfer_id_input: transferId,
  });

  // Handle database-level errors (connection issues, etc.)
  if (error) return { error: error.message };

  // Handle application-level errors returned by the function
  // (e.g., "Transfer not found", "This transfer isn't for you")
  if (data?.error) return { error: data.error };

  // Refresh the pages so they show the updated data
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
