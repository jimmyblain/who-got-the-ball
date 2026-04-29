import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CheckInScheduler } from "@/components/session/check-in-scheduler";
import { resolveFocalScenarioText } from "@/lib/sessions";
import type { Session } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Schedule a check-in reminder for this session.
 * Reached after the user submits their make-the-shift commitment.
 */
export default async function CheckInPage({ params }: Props) {
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
