import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

/**
 * Phase 1 placeholder home.
 * The full home — past sessions list, check-in banner, "Start a session" — lands in Phase 7.
 */
export default async function HomePage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, partner_id")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-xl mx-auto py-12 text-center space-y-6">
      <div className="text-6xl">🏀</div>
      <h1 className="text-3xl font-bold">
        Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.
      </h1>
      <p className="text-muted-foreground">
        The new guided session experience is being built. Check back soon — you&apos;ll
        be able to pick a topic, talk it through with your partner, and walk away
        with a clear next step.
      </p>

      {!profile?.partner_id && (
        <div className="rounded-2xl border bg-card p-6 text-left">
          <h2 className="font-semibold mb-2">First step: link with your partner</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sessions are designed for two people. Send your partner an invite link
            so you&apos;re both ready when the new flow ships.
          </p>
          <Link
            href="/partner"
            className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Go to partner setup →
          </Link>
        </div>
      )}
    </div>
  );
}
