import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { AnswerValue } from "@/lib/types";

/**
 * Conflicts Page — shows all questions where both partners said "mine".
 * A conflict means both people feel responsible for the same thing.
 * The purpose isn't to assign blame — it's to spark a conversation.
 */
export default async function ConflictsPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (!profile?.partner_id) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-2xl font-bold mb-2">No partner connected</h1>
        <p className="text-muted-foreground mb-4">
          You need to connect with a partner before conflicts can be detected.
        </p>
        <Link
          href="/partner"
          className="text-primary font-semibold underline underline-offset-2"
        >
          Set up partner link →
        </Link>
      </div>
    );
  }

  // Get all my answers where I said "mine"
  const { data: myMineAnswers } = await supabase
    .from("answers")
    .select("question_id")
    .eq("user_id", user.id)
    .eq("answer", "mine");

  // Get all partner's answers where they said "mine"
  const { data: partnerMineAnswers } = await supabase
    .from("answers")
    .select("question_id")
    .eq("user_id", profile.partner_id)
    .eq("answer", "mine");

  // Find the overlapping question IDs — those are the conflicts
  const myMineIds = new Set(myMineAnswers?.map((a) => a.question_id) || []);
  const conflictQuestionIds =
    partnerMineAnswers
      ?.filter((a) => myMineIds.has(a.question_id))
      .map((a) => a.question_id) || [];

  // Fetch the actual question text and category info for the conflicts
  let conflicts: {
    question_text: string;
    category_name: string;
    category_color: string;
    category_slug: string;
  }[] = [];

  if (conflictQuestionIds.length > 0) {
    const { data: questions } = await supabase
      .from("questions")
      .select("question_text, category_id")
      .in("id", conflictQuestionIds);

    if (questions) {
      // Get the categories for these questions
      const categoryIds = [...new Set(questions.map((q) => q.category_id))];
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, color, slug")
        .in("id", categoryIds);

      conflicts = questions.map((q) => {
        const cat = categories?.find((c) => c.id === q.category_id);
        return {
          question_text: q.question_text,
          category_name: cat?.name || "",
          category_color: cat?.color || "#888",
          category_slug: cat?.slug || "",
        };
      });
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Conflicts</h1>
      <p className="text-muted-foreground mb-8">
        These are questions where you both said &quot;This is my ball.&quot;
        Time for a conversation!
      </p>

      {conflicts.length === 0 ? (
        // No conflicts — great news!
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-xl font-bold mb-2">No conflicts!</h2>
          <p className="text-muted-foreground">
            You and your partner are on the same page. Nice work!
          </p>
        </div>
      ) : (
        // Show conflict cards
        <div className="space-y-4">
          {conflicts.map((conflict, i) => (
            <Link
              key={i}
              href={`/dashboard/${conflict.category_slug}`}
            >
              <div className="rounded-2xl border bg-card p-5 shadow-sm animate-pulse-border border-red-300 dark:border-red-700 hover:shadow-md transition-shadow cursor-pointer mb-4">
                {/* Category badge */}
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: conflict.category_color }}
                >
                  {conflict.category_name}
                </span>

                {/* Question */}
                <p className="font-medium mt-3 mb-3">{conflict.question_text}</p>

                {/* Discussion prompt */}
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    🗣️ You both feel this is your responsibility — this might
                    be worth discussing together.
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
