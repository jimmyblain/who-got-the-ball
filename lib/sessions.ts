import { createClient } from "@/lib/supabase/server";
import type { Session, Scenario, SessionStatus } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SessionAccess = {
  isMember: boolean;
  status: SessionStatus | null;
};

/**
 * Loads a user's membership and the session's status in a single query.
 * `isMember` is false (and status null) when the session doesn't exist or the
 * user isn't a participant.
 *
 * Defense-in-depth on top of the RLS membership policies: it lets server
 * actions reject writes to sessions the caller isn't part of — or that are
 * already completed — with a clear error instead of a cryptic RLS failure.
 * Note the sessions SELECT is itself RLS-gated to members, so a non-member's
 * lookup returns no row -> isMember false.
 */
export async function getSessionAccess(
  supabase: SupabaseServerClient,
  sessionId: string,
  userId: string,
): Promise<SessionAccess> {
  const { data } = await supabase
    .from("sessions")
    .select("initiator_id, partner_id, status")
    .eq("id", sessionId)
    .maybeSingle<Pick<Session, "initiator_id" | "partner_id" | "status">>();
  if (!data || (data.initiator_id !== userId && data.partner_id !== userId)) {
    return { isMember: false, status: null };
  }
  return { isMember: true, status: data.status };
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
