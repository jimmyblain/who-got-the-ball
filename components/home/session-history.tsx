import Link from "next/link";
import type { Session } from "@/lib/types";

type Props = {
  sessions: Session[];
  scenarioById: Map<string, string>;
};

/**
 * List of past completed sessions on the home page.
 * Each row links into the read-only session summary at /session/[id].
 */
export function SessionHistory({ sessions, scenarioById }: Props) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Past sessions
      </h2>
      <ul className="space-y-2">
        {sessions.map((s) => {
          const text =
            s.focal_scenario_custom ??
            (s.focal_scenario_id ? scenarioById.get(s.focal_scenario_id) : null) ??
            "Untitled session";
          const date = formatDate(s.completed_at ?? s.created_at);
          return (
            <li key={s.id}>
              <Link
                href={`/session/${s.id}`}
                className="block rounded-xl border bg-card p-4 hover:bg-secondary/40 transition-colors"
              >
                <p className="font-medium leading-snug">{text}</p>
                <p className="text-xs text-muted-foreground mt-1">{date}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
