import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RevealCard } from "@/components/session/reveal-card";
import {
  loadOwnedSession,
  resolveFocalScenarioText,
  resolveDisplayName,
} from "@/lib/sessions";
import type { SessionResponse } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RevealPage({ params }: Props) {
  const { id: sessionId } = await params;
  const { supabase, user, session } = await loadOwnedSession(sessionId);

  const { data: responses } = await supabase
    .from("session_responses")
    .select("*")
    .eq("session_id", sessionId)
    .returns<SessionResponse[]>();

  const myResponse = responses?.find((r) => r.user_id === user.id);
  const partnerId =
    session.initiator_id === user.id ? session.partner_id : session.initiator_id;
  const partnerResponse = responses?.find((r) => r.user_id === partnerId);

  if (!myResponse || !partnerResponse) {
    return <NotReadyView sessionId={sessionId} mySubmitted={!!myResponse} />;
  }

  const focalText = await resolveFocalScenarioText(supabase, session);
  const partnerName = await resolveDisplayName(supabase, partnerId);

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Here&apos;s what you both said.</h1>
        <p className="text-sm text-muted-foreground">
          Take a minute with this before moving on.
        </p>
      </div>

      <RevealCard
        focalScenarioText={focalText}
        viewerResponse={myResponse}
        partnerResponse={partnerResponse}
        partnerName={partnerName}
      />

      <div className="text-center pt-2">
        <Button asChild size="lg">
          <Link href={`/session/${sessionId}/pause`}>Continue →</Link>
        </Button>
      </div>
    </div>
  );
}

function NotReadyView({
  sessionId,
  mySubmitted,
}: {
  sessionId: string;
  mySubmitted: boolean;
}) {
  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-4">
      <div className="text-5xl">⏳</div>
      <h1 className="text-2xl font-bold">Not ready yet.</h1>
      <p className="text-muted-foreground">
        {mySubmitted
          ? "Waiting for your partner to submit before you can see the reveal."
          : "You haven't submitted your answers yet."}
      </p>
      {!mySubmitted && (
        <Link
          href={`/session/${sessionId}/answer`}
          className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Answer now →
        </Link>
      )}
    </div>
  );
}
