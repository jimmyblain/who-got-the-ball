import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { RevealCard } from "@/components/session/reveal-card";
import type { Session, SessionResponse, Scenario } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RevealPage({ params }: Props) {
  await connection();
  const { id: sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single<Session>();

  if (!session) notFound();
  if (session.initiator_id !== user.id && session.partner_id !== user.id) {
    notFound();
  }

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

  const focalText = await resolveFocalText(supabase, session);
  const [viewerName, partnerName] = await Promise.all([
    resolveDisplayName(supabase, user.id),
    resolveDisplayName(supabase, partnerId),
  ]);

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
        viewerName={viewerName}
        partnerName={partnerName}
      />

      <div className="text-center pt-2">
        <Link
          href="/dashboard"
          className="inline-block text-sm text-muted-foreground underline underline-offset-4"
        >
          Back to home
        </Link>
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

async function resolveFocalText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: Session,
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

async function resolveDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();
  return profile?.display_name ?? "Your partner";
}
