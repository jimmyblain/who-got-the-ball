"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CUSTOM_KEY, type WhoOption } from "@/lib/session-options";
import { isSessionMember } from "@/lib/sessions";

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

  if (!(await isSessionMember(supabase, input.sessionId, user.id))) {
    return { error: "You're not part of this session." };
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

  if (!(await isSessionMember(supabase, input.sessionId, user.id))) {
    return { error: "You're not part of this session." };
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

  // If both partners have now committed, mark the session completed.
  const { count } = await supabase
    .from("session_actions")
    .select("*", { count: "exact", head: true })
    .eq("session_id", input.sessionId);

  if ((count ?? 0) >= 2) {
    await supabase
      .from("sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", input.sessionId);
  }

  revalidatePath(`/session/${input.sessionId}/shift`);
  revalidatePath("/dashboard");

  return { success: true };
}
