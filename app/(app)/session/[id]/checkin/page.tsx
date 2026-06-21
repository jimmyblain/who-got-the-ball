import { CheckInScheduler } from "@/components/session/check-in-scheduler";
import { loadOwnedSession, resolveFocalScenarioText } from "@/lib/sessions";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Schedule a check-in reminder for this session.
 * Reached after the user submits their make-the-shift commitment.
 */
export default async function CheckInPage({ params }: Props) {
  const { id: sessionId } = await params;
  const { supabase, session } = await loadOwnedSession(sessionId);

  const focalText = await resolveFocalScenarioText(supabase, session);

  return (
    <div className="max-w-xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Want to check in on this?</h1>
        <p className="text-muted-foreground">
          Small check-ins can make a big difference.
        </p>
      </div>

      <div className="rounded-xl border bg-secondary/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          The ball
        </p>
        <p className="font-medium">{focalText}</p>
      </div>

      <CheckInScheduler sessionId={sessionId} />
    </div>
  );
}
