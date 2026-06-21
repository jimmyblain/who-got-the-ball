import { createClient } from "@/lib/supabase/server";
import type { Session, Scenario } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Returns true if `userId` is the initiator or partner of the session.
 *
 * Defense-in-depth on top of the RLS membership policies: it lets server
 * actions reject writes to sessions the caller isn't part of with a clear
 * error instead of a cryptic RLS failure. Note the sessions SELECT is itself
 * RLS-gated to members, so a non-member's lookup returns no row -> false.
 */
export async function isSessionMember(
  supabase: SupabaseServerClient,
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("sessions")
    .select("initiator_id, partner_id")
    .eq("id", sessionId)
    .maybeSingle<Pick<Session, "initiator_id" | "partner_id">>();
  return !!data && (data.initiator_id === userId || data.partner_id === userId);
}

/**
 * Resolve the focal scenario text for a session.
 * Returns the custom text if present, otherwise looks up the preset scenario row.
 */
export async function resolveFocalScenarioText(
  supabase: SupabaseServerClient,
  session: Pick<Session, "focal_scenario_id" | "focal_scenario_custom">,
): Promise<string> {
  if (session.focal_scenario_custom) return session.focal_scenario_custom;
  if (!session.focal_scenario_id) return "(unknown scenario)";
  const { data: scenario } = await supabase
    .from("scenarios")
    .select("scenario_text")
    .eq("id", session.focal_scenario_id)
    .single<Pick<Scenario, "scenario_text">>();
  return scenario?.scenario_text ?? "(unknown scenario)";
}
