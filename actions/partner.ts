"use server";

/**
 * Server Actions for the partner system.
 * Partners are two users who link their accounts to compare answers.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Link the current user with another user using their invite code.
 * This is a two-way link: both users get each other as their partner.
 */
export async function linkPartner(inviteCode: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Look up who this invite code belongs to
  const { data: partnerProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, display_name, partner_id")
    .eq("invite_code", inviteCode)
    .single();

  if (lookupError || !partnerProfile) {
    return { error: "Invalid invite code. Please check and try again." };
  }

  // Can't partner with yourself!
  if (partnerProfile.id === user.id) {
    return { error: "You can't partner with yourself!" };
  }

  // Check if the other person already has a partner
  if (partnerProfile.partner_id) {
    return { error: "This person is already partnered with someone else." };
  }

  // Check if you already have a partner
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (myProfile?.partner_id) {
    return { error: "You already have a partner. Unlink first to partner with someone new." };
  }

  // Link both profiles to each other (two-way link)
  const { error: updateError1 } = await supabase
    .from("profiles")
    .update({ partner_id: partnerProfile.id })
    .eq("id", user.id);

  if (updateError1) return { error: updateError1.message };

  const { error: updateError2 } = await supabase
    .from("profiles")
    .update({ partner_id: user.id })
    .eq("id", partnerProfile.id);

  if (updateError2) return { error: updateError2.message };

  revalidatePath("/dashboard");
  revalidatePath("/partner");

  return { success: true, partnerName: partnerProfile.display_name };
}

/**
 * Unlink the current user from their partner.
 * Both users lose their partner connection.
 */
export async function unlinkPartner() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get current partner
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (!myProfile?.partner_id) {
    return { error: "You don't have a partner to unlink." };
  }

  // Remove partner link from both profiles
  await supabase
    .from("profiles")
    .update({ partner_id: null })
    .eq("id", user.id);

  await supabase
    .from("profiles")
    .update({ partner_id: null })
    .eq("id", myProfile.partner_id);

  // Cancel all pending transfers between them
  await supabase
    .from("transfers")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("status", "pending")
    .or(
      `and(from_user_id.eq.${user.id},to_user_id.eq.${myProfile.partner_id}),and(from_user_id.eq.${myProfile.partner_id},to_user_id.eq.${user.id})`
    );

  revalidatePath("/dashboard");
  revalidatePath("/partner");

  return { success: true };
}
