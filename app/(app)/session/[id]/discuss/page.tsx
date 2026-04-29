import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DiscussionTimer } from "@/components/session/discussion-timer";
import { HEALTHY_PHRASES } from "@/lib/session-options";
import type { Session } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Discussion screen — phrases to start with, optional 2-minute timer,
 * and a "We talked" CTA into the make-the-shift step.
 */
export default async function DiscussPage({ params }: Props) {
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

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Let&apos;s talk about it.</h1>
        <p className="text-muted-foreground">
          Take a minute to talk through your answers with each other.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Some healthy ways to start</h2>
        <ul className="space-y-3">
          {HEALTHY_PHRASES.map((phrase, i) => (
            <li
              key={i}
              className="rounded-lg bg-secondary/40 p-4 text-sm leading-relaxed italic"
            >
              &ldquo;{phrase}&rdquo;
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Want to keep things focused?
        </p>
        <DiscussionTimer />
      </div>

      <div className="text-center">
        <Button asChild size="lg">
          <Link href={`/session/${sessionId}/shift`}>We talked →</Link>
        </Button>
      </div>
    </div>
  );
}
