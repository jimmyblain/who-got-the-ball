import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

const AUDIENCE_BUTTONS: { label: string; href: string }[] = [
  // Stakeholder will fill in real destinations later.
  { label: "Work with me", href: "#" },
  { label: "Learn more", href: "#" },
  { label: "Get the full Framework", href: "#" },
];

/**
 * Closing screen after the user finishes scheduling (or skipping) a check-in.
 * Acknowledges the work and surfaces the audience CTAs.
 */
export default async function DonePage({ params }: Props) {
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
    <div className="max-w-2xl mx-auto py-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="text-5xl">🙌</div>
        <h1 className="text-3xl font-bold">That wasn&apos;t easy.</h1>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <p className="leading-relaxed">
          Taking the time to reflect and actually talk about this takes
          effort. Most people don&apos;t slow down enough to do that.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This was one conversation. Imagine what happens if you go deeper.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-center">
          Bring this into your life
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 text-center text-sm">
          <div className="rounded-xl border bg-card p-4">Relationships</div>
          <div className="rounded-xl border bg-card p-4">Schools &amp; Students</div>
          <div className="rounded-xl border bg-card p-4">Teams &amp; Organizations</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          {AUDIENCE_BUTTONS.map((b) => (
            <Button key={b.label} variant="outline" asChild>
              <Link href={b.href}>{b.label}</Link>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Links coming soon.
        </p>
      </div>

      <div className="text-center pt-4">
        <Button asChild size="lg">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
