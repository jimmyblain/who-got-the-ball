import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ShiftForm } from "@/components/session/shift-form";
import type { Session, SessionAction } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Make-the-shift screen — pick one action and one language phrase.
 * Pre-fills with the user's previous selection if they're revisiting.
 */
export default async function ShiftPage({ params }: Props) {
  await connection();
  const { id: sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("initiator_id, partner_id")
    .eq("id", sessionId)
    .single<Pick<Session, "initiator_id" | "partner_id">>();

  if (!session) notFound();
  if (session.initiator_id !== user.id && session.partner_id !== user.id) {
    notFound();
  }

  const { data: existing } = await supabase
    .from("session_actions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle<SessionAction>();

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Make the shift.</h1>
        <p className="text-muted-foreground">
          What would it look like for you to pick up the ball, even a little?
        </p>
      </div>

      <ShiftForm
        sessionId={sessionId}
        initialAction={existing?.action ?? null}
        initialLanguage={existing?.language ?? null}
      />
    </div>
  );
}
