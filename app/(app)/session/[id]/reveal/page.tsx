import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Session, SessionResponse } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Phase 4 placeholder. The real reveal (color-coded comparison) lands soon.
 * For now this just confirms both partners have submitted.
 */
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

  const bothSubmitted = (responses?.length ?? 0) === 2;
  const mySubmitted = responses?.some((r) => r.user_id === user.id);

  if (!bothSubmitted) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">⏳</div>
        <h1 className="text-2xl font-bold">Not ready yet.</h1>
        <p className="text-muted-foreground">
          {mySubmitted
            ? "Waiting for your partner to submit."
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

  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-4">
      <div className="text-5xl">🎬</div>
      <h1 className="text-2xl font-bold">The reveal is being built.</h1>
      <p className="text-muted-foreground">
        Both of you have submitted. The side-by-side comparison with color-coded
        outcomes ships in the next phase.
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
