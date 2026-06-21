import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loadOwnedSession } from "@/lib/sessions";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Insight pause — sits between the reveal and the discussion.
 * Static screen; no DB writes.
 */
export default async function PausePage({ params }: Props) {
  const { id: sessionId } = await params;
  await loadOwnedSession(sessionId);

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8 text-center">
      <h1 className="text-3xl font-bold">Pause for a second.</h1>

      <div className="rounded-2xl border bg-card p-8 space-y-4 text-left">
        <p className="text-lg leading-relaxed">
          When both people feel like the other person has the ball, the ball
          usually gets dropped.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This is where communication breaks down — not because people
          don&apos;t care, but because responsibility isn&apos;t clearly shared.
        </p>
      </div>

      <Button asChild size="lg">
        <Link href={`/session/${sessionId}/discuss`}>Continue →</Link>
      </Button>
    </div>
  );
}
