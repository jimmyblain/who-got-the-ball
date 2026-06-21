import { ShiftForm } from "@/components/session/shift-form";
import { loadOwnedSession } from "@/lib/sessions";
import type { SessionAction } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Make-the-shift screen — pick one action and one language phrase.
 * Pre-fills with the user's previous selection if they're revisiting.
 */
export default async function ShiftPage({ params }: Props) {
  const { id: sessionId } = await params;
  const { supabase, user } = await loadOwnedSession(sessionId);

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
