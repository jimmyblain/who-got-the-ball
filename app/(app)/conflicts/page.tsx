import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlignmentCard } from "@/components/alignment/alignment-card";
import type { AnswerValue } from "@/lib/types";

/**
 * Alignment Page (formerly "Conflicts") — compares both partners' answers
 * across all questions and groups them into agreements vs. discussion items.
 *
 * Matching logic (what counts as "in agreement"):
 * - Both say "shared" → Agreement
 * - I say "mine" + partner says "partner" → Agreement (both agree I own it)
 * - I say "partner" + partner says "mine" → Agreement (both agree they own it)
 * - Everything else → Needs discussion (including mismatches, one-sided answers)
 */

/** A single comparison item — one question with both partners' answers */
type ComparisonItem = {
  question_id: string;
  question_text: string;
  category_name: string;
  category_color: string;
  category_slug: string;
  my_answer: AnswerValue | null;
  partner_answer: AnswerValue | null;
};

/**
 * Check if two answers are "in agreement" using our matching rules.
 * Returns true if the pair represents agreement, false if it needs discussion.
 */
function isAgreement(mine: AnswerValue | null, theirs: AnswerValue | null): boolean {
  if (!mine || !theirs) return false; // Can't agree if someone hasn't answered
  return (
    (mine === "shared" && theirs === "shared") ||
    (mine === "mine" && theirs === "partner") ||
    (mine === "partner" && theirs === "mine")
  );
}

export default async function AlignmentPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get user profile to check for partner
  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  // If no partner, show a prompt to connect
  if (!profile?.partner_id) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-2xl font-bold mb-2">No partner connected</h1>
        <p className="text-muted-foreground mb-4">
          You need to connect with a partner to compare your answers.
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

  // Fetch all categories and questions (we need all of them for the comparison)
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .order("sort_order");

  // Fetch both partners' answers
  const { data: myAnswers } = await supabase
    .from("answers")
    .select("question_id, answer")
    .eq("user_id", user.id);

  const { data: partnerAnswers } = await supabase
    .from("answers")
    .select("question_id, answer")
    .eq("user_id", profile.partner_id);

  if (!categories || !questions) {
    return <p>Error loading data.</p>;
  }

  // Build lookup maps for quick answer retrieval
  const myAnswerMap = new Map(
    (myAnswers || []).map((a) => [a.question_id, a.answer as AnswerValue])
  );
  const partnerAnswerMap = new Map(
    (partnerAnswers || []).map((a) => [a.question_id, a.answer as AnswerValue])
  );

  // Build a category lookup map
  const categoryMap = new Map(
    categories.map((c) => [c.id, c])
  );

  // Build comparison items for every question
  const allItems: ComparisonItem[] = questions.map((q) => {
    const cat = categoryMap.get(q.category_id);
    return {
      question_id: q.id,
      question_text: q.question_text,
      category_name: cat?.name || "",
      category_color: cat?.color || "#888",
      category_slug: cat?.slug || "",
      my_answer: myAnswerMap.get(q.id) || null,
      partner_answer: partnerAnswerMap.get(q.id) || null,
    };
  });

  // Split into three groups: agreements, discussion items, and unanswered
  const agreements: ComparisonItem[] = [];
  const discussions: ComparisonItem[] = [];
  const unanswered: ComparisonItem[] = [];

  allItems.forEach((item) => {
    // If neither partner has answered, it's unanswered
    if (!item.my_answer && !item.partner_answer) {
      unanswered.push(item);
    }
    // If exactly one person answered, it needs discussion (incomplete)
    else if (!item.my_answer || !item.partner_answer) {
      discussions.push(item);
    }
    // Both answered — check if they agree
    else if (isAgreement(item.my_answer, item.partner_answer)) {
      agreements.push(item);
    }
    // Both answered but don't agree — needs discussion
    else {
      discussions.push(item);
    }
  });

  // Group discussion items by category for better organization
  const discussionsByCategory = new Map<string, ComparisonItem[]>();
  discussions.forEach((item) => {
    const existing = discussionsByCategory.get(item.category_name) || [];
    existing.push(item);
    discussionsByCategory.set(item.category_name, existing);
  });

  // Helper labels for displaying answers in plain language
  const answerLabels: Record<AnswerValue, string> = {
    mine: "My ball",
    partner: "Partner's ball",
    shared: "Shared",
  };

  const answerEmojis: Record<AnswerValue, string> = {
    mine: "🙋",
    partner: "🙋‍♂️",
    shared: "🤝",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Alignment</h1>
      <p className="text-muted-foreground mb-8">
        See where you and your partner agree — and where you might want to talk.
      </p>

      {/* Discussion items section — shown first, expanded by default */}
      {discussions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            To discuss ({discussions.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            These items have different answers — a good starting point for conversation.
          </p>

          {/* Group by category */}
          {Array.from(discussionsByCategory.entries()).map(([categoryName, items]) => (
            <div key={categoryName} className="mb-6">
              {/* Category subheader */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: items[0].category_color }}
                >
                  {categoryName}
                </span>
              </div>

              {/* Discussion cards for this category */}
              <div className="space-y-3">
                {items.map((item) => (
                  <AlignmentCard
                    key={item.question_id}
                    questionId={item.question_id}
                    questionText={item.question_text}
                    categoryColor={item.category_color}
                    categorySlug={item.category_slug}
                    myAnswer={item.my_answer}
                    partnerAnswer={item.partner_answer}
                    answerLabels={answerLabels}
                    answerEmojis={answerEmojis}
                    type="discussion"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No discussion items — celebration! */}
      {discussions.length === 0 && agreements.length > 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center mb-8">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-xl font-bold mb-2">Perfect alignment!</h2>
          <p className="text-muted-foreground">
            You and your partner agree on everything you&apos;ve both answered. Amazing!
          </p>
        </div>
      )}

      {/* Agreements section — collapsed by default using <details> */}
      {agreements.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer text-lg font-bold mb-4 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
            <span className="w-3 h-3 rounded-full bg-green-400" />
            Agreements ({agreements.length})
            <span className="text-sm font-normal text-muted-foreground ml-1">
              — tap to expand
            </span>
          </summary>

          <div className="space-y-3 mt-4">
            {agreements.map((item) => (
              <div
                key={item.question_id}
                className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10 p-4"
              >
                {/* Category badge */}
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: item.category_color }}
                >
                  {item.category_name}
                </span>

                {/* Question text */}
                <p className="font-medium mt-2 mb-2">{item.question_text}</p>

                {/* Both answers side by side */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    You: {item.my_answer && answerEmojis[item.my_answer]}{" "}
                    {item.my_answer && answerLabels[item.my_answer]}
                  </span>
                  <span>
                    Partner: {item.partner_answer && answerEmojis[item.partner_answer]}{" "}
                    {item.partner_answer && answerLabels[item.partner_answer]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Unanswered section — only show if there are unanswered questions */}
      {unanswered.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
            Not yet answered ({unanswered.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Neither of you has answered these yet.
          </p>
          <div className="space-y-2">
            {unanswered.map((item) => (
              <Link
                key={item.question_id}
                href={`/dashboard/${item.category_slug}`}
                className="block rounded-xl border bg-card p-3 hover:shadow-sm transition-shadow"
              >
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white mr-2"
                  style={{ backgroundColor: item.category_color }}
                >
                  {item.category_name}
                </span>
                <span className="text-sm">{item.question_text}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state: no answers at all */}
      {agreements.length === 0 && discussions.length === 0 && unanswered.length > 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-bold mb-2">Nothing to compare yet</h2>
          <p className="text-muted-foreground">
            Start answering questions from the{" "}
            <Link
              href="/dashboard"
              className="font-semibold underline underline-offset-2"
            >
              dashboard
            </Link>{" "}
            so you can compare with your partner.
          </p>
        </div>
      )}
    </div>
  );
}
