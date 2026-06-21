import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RevealCard } from "@/components/session/reveal-card";
import {
  loadOwnedSession,
  resolveFocalScenarioText,
  resolveDisplayName,
} from "@/lib/sessions";
import {
  ACTION_OPTIONS,
  LANGUAGE_OPTIONS,
  CUSTOM_KEY,
  labelFor,
} from "@/lib/session-options";
import type {
  SessionResponse,
  SessionAction,
  CheckIn,
} from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Read-only summary of a session: focal scenario, both responses (with the
 * full reveal card), each partner's commitments, and any check-in status.
 * Reachable from the home page's past sessions list and from the check-in banner.
 */
export default async function SessionSummaryPage({ params }: Props) {
  const { id: sessionId } = await params;
  const { supabase, user, session } = await loadOwnedSession(sessionId);

  const partnerId =
    session.initiator_id === user.id ? session.partner_id : session.initiator_id;

  const [
    focalText,
    { data: responses },
    { data: actions },
    { data: checkIn },
    partnerName,
  ] = await Promise.all([
    resolveFocalScenarioText(supabase, session),
    supabase
      .from("session_responses")
      .select("*")
      .eq("session_id", sessionId)
      .returns<SessionResponse[]>(),
    supabase
      .from("session_actions")
      .select("*")
      .eq("session_id", sessionId)
      .returns<SessionAction[]>(),
    supabase
      .from("check_ins")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<CheckIn>(),
    resolveDisplayName(supabase, partnerId),
  ]);

  const myResponse = responses?.find((r) => r.user_id === user.id);
  const partnerResponse = responses?.find((r) => r.user_id === partnerId);
  const myAction = actions?.find((a) => a.user_id === user.id);
  const partnerAction = actions?.find((a) => a.user_id === partnerId);

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Session • {formatDate(session.created_at)}
        </p>
        <h1 className="text-3xl font-bold">{focalText}</h1>
        <p className="text-sm text-muted-foreground">
          {session.status === "completed" ? "Completed" : "In progress"}
        </p>
      </div>

      {myResponse && partnerResponse ? (
        <RevealCard
          focalScenarioText={focalText}
          viewerResponse={myResponse}
          partnerResponse={partnerResponse}
          partnerName={partnerName}
        />
      ) : (
        <IncompleteResponses
          sessionId={sessionId}
          mySubmitted={!!myResponse}
        />
      )}

      <CommitmentsCard
        myAction={myAction}
        partnerAction={partnerAction}
        partnerName={partnerName}
      />

      <CheckInStatus checkIn={checkIn ?? null} />

      <div className="text-center pt-4">
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}

function CommitmentsCard({
  myAction,
  partnerAction,
  partnerName,
}: {
  myAction: SessionAction | undefined;
  partnerAction: SessionAction | undefined;
  partnerName: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <h2 className="font-semibold">What you each committed to</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <CommitmentColumn label="You" action={myAction} />
        <CommitmentColumn label={partnerName} action={partnerAction} />
      </div>
    </div>
  );
}

function CommitmentColumn({
  label,
  action,
}: {
  label: string;
  action: SessionAction | undefined;
}) {
  if (!action) {
    return (
      <div className="rounded-xl bg-secondary/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">{label}</p>
        <p>Hasn&apos;t committed yet.</p>
      </div>
    );
  }

  const actionText =
    action.action === CUSTOM_KEY && action.action_custom
      ? action.action_custom
      : labelFor(ACTION_OPTIONS, action.action);
  const languageText =
    action.language === CUSTOM_KEY && action.language_custom
      ? action.language_custom
      : labelFor(LANGUAGE_OPTIONS, action.language);

  return (
    <div className="rounded-xl bg-secondary/30 p-4 space-y-3">
      <p className="font-medium">{label}</p>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          One small action
        </p>
        <p className="text-sm">{actionText}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          One thing to say
        </p>
        <p className="text-sm">{languageText}</p>
      </div>
    </div>
  );
}

function CheckInStatus({ checkIn }: { checkIn: CheckIn | null }) {
  if (!checkIn) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        No check-in scheduled.
      </div>
    );
  }

  const date = formatDate(checkIn.scheduled_for);
  const labelByStatus: Record<CheckIn["status"], string> = {
    pending: `Check-in scheduled for ${date}.`,
    completed: `Check-in completed (was scheduled for ${date}).`,
    dismissed: `Check-in dismissed (was scheduled for ${date}).`,
  };

  return (
    <div className="rounded-2xl border bg-card p-5 text-sm">
      {labelByStatus[checkIn.status]}
    </div>
  );
}

function IncompleteResponses({
  sessionId,
  mySubmitted,
}: {
  sessionId: string;
  mySubmitted: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-3">
      <p className="font-semibold">
        {mySubmitted
          ? "Waiting for your partner to answer."
          : "You haven't answered yet."}
      </p>
      {!mySubmitted && (
        <Button asChild>
          <Link href={`/session/${sessionId}/answer`}>Answer now →</Link>
        </Button>
      )}
    </div>
  );
}

function formatDate(value: string): string {
  // A DATE column (e.g. check_ins.scheduled_for) comes back as "YYYY-MM-DD".
  // `new Date("2026-06-23")` parses as UTC midnight, which renders as the
  // PREVIOUS day for users behind UTC. Parse date-only values as local midnight
  // so the stored calendar date is shown faithfully; timestamps parse as-is.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = isDateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

