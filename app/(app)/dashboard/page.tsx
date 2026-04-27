import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Session, Scenario } from "@/lib/types";

/**
 * Placeholder home. The full home (history, check-in banner, etc.) lands in Phase 7.
 * For now: surfaces any in-progress sessions and a "Start a session" CTA.
 */
export default async function HomePage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, partner_id")
    .eq("id", user.id)
    .single();

  const [{ data: sessions }, { data: scenarios }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .returns<Session[]>(),
    supabase.from("scenarios").select("id, scenario_text").returns<Pick<Scenario, "id" | "scenario_text">[]>(),
  ]);

  const scenarioById = new Map(scenarios?.map((s) => [s.id, s.scenario_text]) ?? []);
  const inProgress = sessions ?? [];

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">🏀</div>
        <h1 className="text-3xl font-bold">
          Hey{profile?.display_name ? `, ${profile.display_name}` : ""}.
        </h1>
      </div>

      {!profile?.partner_id ? (
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold mb-2">First step: link with your partner</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sessions are designed for two people. Send your partner an invite
            link to get started.
          </p>
          <Link
            href="/partner"
            className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Go to partner setup →
          </Link>
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                In progress
              </h2>
              {inProgress.map((s) => {
                const text =
                  s.focal_scenario_custom ??
                  (s.focal_scenario_id ? scenarioById.get(s.focal_scenario_id) : null) ??
                  "Untitled session";
                return (
                  <Link
                    key={s.id}
                    href={`/session/${s.id}/answer`}
                    className="block rounded-2xl border bg-card p-5 hover:bg-secondary/40 transition-colors"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      The ball
                    </p>
                    <p className="font-medium">{text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Continue →
                    </p>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
            <h2 className="text-xl font-bold">Start a new session</h2>
            <p className="text-sm text-muted-foreground">
              Pick something that&apos;s been coming up and walk through it
              together.
            </p>
            <Link
              href="/session/new"
              className="inline-block px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Start a session →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
