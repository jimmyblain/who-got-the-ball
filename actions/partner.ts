"use server";

/**
 * Server Actions for the partner system.
 * Partners are two users who link their accounts to compare answers.
 *
 * IMPORTANT: Both linkPartner and unlinkPartner use SECURITY DEFINER
 * SQL functions (via supabase.rpc()) instead of direct table updates.
 * Why? Because Row Level Security (RLS) only lets you update YOUR OWN
 * profile row. But linking/unlinking partners requires updating BOTH
 * users' profiles. SECURITY DEFINER functions run with elevated
 * privileges, bypassing RLS — like a trusted admin doing the update
 * on behalf of the user.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Link the current user with another user using their invite code.
 * This calls the `link_partners` SQL function which handles both sides
 * of the link atomically (either both succeed or neither does).
 */
export async function linkPartner(inviteCode: string) {
  const supabase = await createClient();

  // Make sure the user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Call the SECURITY DEFINER function that links both profiles.
  // This function validates the invite code, checks neither user is
  // already partnered, and updates both profiles' partner_id fields.
  const { data, error } = await supabase.rpc("link_partners", {
    invite_code_input: inviteCode,
  });

  // The function returns a JSON object like:
  // { success: true, partner_name: "Alice" } or { error: "some message" }
  if (error) return { error: error.message };

  // Check for application-level errors returned by the function
  if (data?.error) return { error: data.error };

  // Refresh the cached data on these pages so the UI updates immediately
  revalidatePath("/dashboard");
  revalidatePath("/partner");

  return { success: true, partnerName: data?.partner_name };
}

/**
 * Unlink the current user from their partner.
 * This calls the `unlink_partners` SQL function which clears both
 * users' partner_id and cancels any pending transfers between them.
 */
export async function unlinkPartner() {
  const supabase = await createClient();

  // Make sure the user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Call the SECURITY DEFINER function that unlinks both profiles.
  // This function also cancels any pending transfers between the two users.
  const { data, error } = await supabase.rpc("unlink_partners");

  if (error) return { error: error.message };

  // Check for application-level errors returned by the function
  if (data?.error) return { error: data.error };

  // Refresh the cached data on these pages so the UI updates immediately
  revalidatePath("/dashboard");
  revalidatePath("/partner");

  return { success: true };
}
