import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewSessionFlow } from "@/components/session/new-session-flow";
import type { Category, Scenario } from "@/lib/types";

/**
 * Selection funnel entry point.
 * Gates on partner-linking — without a partner, sessions can't be run.
 */
export default async function NewSessionPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (!profile?.partner_id) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="text-5xl">🤝</div>
        <h1 className="text-2xl font-bold">Link with a partner first</h1>
        <p className="text-muted-foreground">
          Sessions are designed for two people. Send your partner an invite link
          before starting.
        </p>
        <Link
          href="/partner"
          className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Go to partner setup →
        </Link>
      </div>
    );
  }

  const [{ data: categories }, { data: scenarios }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("scenarios").select("*").order("sort_order"),
  ]);

  const allCategories = (categories ?? []) as Category[];
  const allScenarios = (scenarios ?? []) as Scenario[];

  const topScenarios = allScenarios.filter((s) => s.category_id === null);
  const scenariosByCategoryId: Record<string, Scenario[]> = {};
  for (const s of allScenarios) {
    if (s.category_id) {
      (scenariosByCategoryId[s.category_id] ??= []).push(s);
    }
  }

  return (
    <div className="py-6">
      <NewSessionFlow
        categories={allCategories}
        topScenarios={topScenarios}
        scenariosByCategoryId={scenariosByCategoryId}
      />
    </div>
  );
}
