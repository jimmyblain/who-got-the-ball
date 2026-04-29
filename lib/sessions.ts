import { createClient } from "@/lib/supabase/server";
import type { Session, Scenario } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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
