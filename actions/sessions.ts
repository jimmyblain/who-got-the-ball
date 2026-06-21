"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CUSTOM_KEY,
  WHO_OPTIONS,
  WHY_OPTIONS,
  EXPECTATION_OPTIONS,
  ACTION_OPTIONS,
  LANGUAGE_OPTIONS,
  isPresetKey,
  type WhoOption,
} from "@/lib/session-options";
import { getSessionAccess } from "@/lib/sessions";

type ScenarioChoice = {
  scenarioId: string | null;
  customText: string | null;
};

export type CreateSessionInput = {
  topScenario: ScenarioChoice;
  selectedCategoryIds: string[];
  focalCategoryId: string;
  focalScenario: ScenarioChoice;
};

/**
 * Create a session for the current user + their linked partner.
 * Validates the user has a partner. Redirects into the answer wizard on success.
 */
export async function createSession(input: CreateSessionInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (!profile?.partner_id) {
    return { error: "You need to link with a partner before starting a session." };
  }

  if (!input.selectedCategoryIds.length) {
    return { error: "Pick at least one category." };
  }
  if (!input.selectedCategoryIds.includes(input.focalCategoryId)) {
    return { error: "Focal category must be one of the selected categories." };
  }
  if (!input.topScenario.scenarioId && !input.topScenario.customText?.trim()) {
    return { error: "Pick or describe a scenario." };
  }
  if (!input.focalScenario.scenarioId && !input.focalScenario.customText?.trim()) {
    return { error: "Pick or describe a focal scenario." };
  }

  // Validate preset scenario choices against the DB so a crafted request can't
  // persist a focal scenario from the wrong category (or a non-top-level
  // scenario as the top-of-mind one). Custom free-text choices skip this.
  if (input.topScenario.scenarioId) {
    const { data: top } = await supabase
      .from("scenarios")
      .select("category_id")
      .eq("id", input.topScenario.scenarioId)
      .maybeSingle<{ category_id: string | null }>();
    if (!top || top.category_id !== null) {
      return { error: "That isn't a valid top-level scenario." };
    }
  }
  if (input.focalScenario.scenarioId) {
    const { data: focal } = await supabase
      .from("scenarios")
      .select("category_id")
      .eq("id", input.focalScenario.scenarioId)
      .maybeSingle<{ category_id: string | null }>();
    if (!focal || focal.category_id !== input.focalCategoryId) {
      return { error: "That scenario doesn't belong to the chosen category." };
    }
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      initiator_id: user.id,
      partner_id: profile.partner_id,
      top_scenario_id: input.topScenario.scenarioId,
      top_scenario_custom: input.topScenario.customText?.trim() || null,
      selected_category_ids: input.selectedCategoryIds,
      focal_category_id: input.focalCategoryId,
      focal_scenario_id: input.focalScenario.scenarioId,
      focal_scenario_custom: input.focalScenario.customText?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !session) return { error: error?.message ?? "Could not create session" };

  revalidatePath("/dashboard");
  redirect(`/session/${session.id}/answer`);
}

export type SubmitResponseInput = {
  sessionId: string;
  whoHasBall: WhoOption;
  why: string;            // preset key OR CUSTOM_KEY
  whyCustom: string | null;
  expectation: string;    // preset key OR CUSTOM_KEY
  expectationCustom: string | null;
};

/**
 * Submit (or update) the current user's response to a session.
 * Both partners may submit independently; either may revisit/edit until
 * the session is marked completed.
 */
export async function submitResponse(input: SubmitResponseInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { isMember, status } = await getSessionAccess(
    supabase,
    input.sessionId,
    user.id,
  );
  if (!isMember) {
    return { error: "You're not part of this session." };
  }
  if (status !== "in_progress") {
    return { error: "This session is already complete." };
  }

  // Reject values that aren't a known preset (or 'custom' where allowed) so a
  // crafted request can't store arbitrary text the partner would see.
  if (!isPresetKey(WHO_OPTIONS, input.whoHasBall)) {
    return { error: "Pick who's got the ball." };
  }
  if (input.why !== CUSTOM_KEY && !isPresetKey(WHY_OPTIONS, input.why)) {
    return { error: "Pick a valid reason." };
  }
  if (
    input.expectation !== CUSTOM_KEY &&
    !isPresetKey(EXPECTATION_OPTIONS, input.expectation)
  ) {
    return { error: "Pick a valid expectation." };
  }
  if (input.why === CUSTOM_KEY && !input.whyCustom?.trim()) {
    return { error: "Please describe your 'why'." };
  }
  if (input.expectation === CUSTOM_KEY && !input.expectationCustom?.trim()) {
    return { error: "Please describe what you're waiting for." };
  }

  const { error } = await supabase.from("session_responses").upsert(
    {
      session_id: input.sessionId,
      user_id: user.id,
      who_has_ball: input.whoHasBall,
      why: input.why,
      why_custom: input.why === CUSTOM_KEY ? input.whyCustom?.trim() ?? null : null,
      expectation: input.expectation,
      expectation_custom:
        input.expectation === CUSTOM_KEY ? input.expectationCustom?.trim() ?? null : null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath(`/session/${input.sessionId}/answer`);
  revalidatePath(`/session/${input.sessionId}/reveal`);

  return { success: true };
}

export type SubmitActionInput = {
  sessionId: string;
  action: string;          // preset key; CUSTOM_KEY-style not exposed in v1
  language: string;
};

/**
 * Persist the current user's "Make the shift" commitment (one action + one
 * language phrase). When BOTH partners have committed, mark the session
 * `completed` so it drops out of the in-progress list on the home page.
 */
export async function submitAction(input: SubmitActionInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { isMember, status } = await getSessionAccess(
    supabase,
    input.sessionId,
    user.id,
  );
  if (!isMember) {
    return { error: "You're not part of this session." };
  }
  if (status !== "in_progress") {
    return { error: "This session is already complete." };
  }

  if (!isPresetKey(ACTION_OPTIONS, input.action)) {
    return { error: "Pick a valid action." };
  }
  if (!isPresetKey(LANGUAGE_OPTIONS, input.language)) {
    return { error: "Pick a valid phrase." };
  }

  // You can only commit to a shift after you've answered. This also stops a
  // deep-link straight to /shift from completing a session that has no
  // responses (which could never render a reveal).
  const { data: ownResponse } = await supabase
    .from("session_responses")
    .select("user_id")
    .eq("session_id", input.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ownResponse) {
    return { error: "Answer the questions before making the shift." };
  }

  const { error: upsertError } = await supabase.from("session_actions").upsert(
    {
      session_id: input.sessionId,
      user_id: user.id,
      action: input.action,
      action_custom: null,
      language: input.language,
      language_custom: null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" },
  );

  if (upsertError) return { error: upsertError.message };

  // Marking the session completed once BOTH partners have committed is handled
  // atomically by the complete_session_when_both_committed() trigger on
  // session_actions. Doing the count+update here would race when both partners
  // submit at the same time (each could read count < 2 and neither would flip).

  revalidatePath(`/session/${input.sessionId}/shift`);
  revalidatePath(`/session/${input.sessionId}`);
  revalidatePath("/dashboard");

  return { success: true };
}
