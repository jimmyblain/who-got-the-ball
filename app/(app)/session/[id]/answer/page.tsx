import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AnswerFlow } from "@/components/session/answer-flow";
import { resolveFocalScenarioText } from "@/lib/sessions";
import type { Session, SessionResponse } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AnswerPage({ params }: Props) {
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

  const focalText = await resolveFocalScenarioText(supabase, session);

  const { data: responses } = await supabase
    .from("session_responses")
    .select("*")
    .eq("session_id", sessionId)
    .returns<SessionResponse[]>();

  const myResponse = responses?.find((r) => r.user_id === user.id);
  const partnerId =
    session.initiator_id === user.id ? session.partner_id : session.initiator_id;
  const partnerResponse = responses?.find((r) => r.user_id === partnerId);

  if (myResponse) {
    return (
      <SubmittedView
        sessionId={sessionId}
        partnerSubmitted={!!partnerResponse}
        partnerId={partnerId}
        supabaseClient={supabase}
      />
    );
  }

  return (
    <div className="py-6">
      <AnswerFlow sessionId={sessionId} focalScenarioText={focalText} />
    </div>
  );
}

async function SubmittedView({
  sessionId,
  partnerSubmitted,
  partnerId,
  supabaseClient,
}: {
  sessionId: string;
  partnerSubmitted: boolean;
  partnerId: string;
  supabaseClient: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data: partner } = await supabaseClient
    .from("profiles")
    .select("display_name")
    .eq("id", partnerId)
    .single();
  const partnerName = partner?.display_name ?? "your partner";

  if (partnerSubmitted) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold">You&apos;re both done.</h1>
        <p className="text-muted-foreground">
          Time to see how your answers compare.
        </p>
        <Link
          href={`/session/${sessionId}/reveal`}
          className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          See the reveal →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-4">
      <div className="text-5xl">⏳</div>
      <h1 className="text-2xl font-bold">Submitted.</h1>
      <p className="text-muted-foreground">
        Waiting for {partnerName} to answer. We&apos;ll show you the reveal once you&apos;re both done.
      </p>
      <Link
        href="/dashboard"
        className="inline-block text-sm text-muted-foreground underline underline-offset-4"
      >
        Back to home
      </Link>
    </div>
  );
}
