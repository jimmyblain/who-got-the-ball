import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CategoryCard } from "@/components/dashboard/category-card";
import type { CategoryWithStats, AnswerValue } from "@/lib/types";

/**
 * Dashboard Home — shows one card per category with summary stats.
 * This is the main hub after onboarding. Users see their categories
 * and can tap into any one to see the detailed questions.
 *
 * This is a Server Component — it fetches data on the server before
 * sending HTML to the browser. This makes it fast and secure.
 */
export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get the user's profile (for partner info)
  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  const hasPartner = !!profile?.partner_id;

  // Fetch all categories
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  // Fetch all questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .order("sort_order");

  // Fetch the user's answers
  const { data: myAnswers } = await supabase
    .from("answers")
    .select("*")
    .eq("user_id", user.id);

  // Fetch partner's answers (if partnered)
  let partnerAnswers: { question_id: string; answer: AnswerValue }[] = [];
  if (hasPartner) {
    const { data } = await supabase
      .from("answers")
      .select("question_id, answer")
      .eq("user_id", profile!.partner_id!);
    if (data) partnerAnswers = data as { question_id: string; answer: AnswerValue }[];
  }

  if (!categories || !questions) {
    return <p>Error loading data.</p>;
  }

  // Build category cards with summary stats
  const categoriesWithStats: CategoryWithStats[] = categories.map((cat) => {
    const catQuestions = questions.filter((q) => q.category_id === cat.id);
    const catAnswers = myAnswers?.filter((a) =>
      catQuestions.some((q) => q.id === a.question_id)
    ) || [];

    // Count how many balls are mine, partner's, or shared
    const mine_count = catAnswers.filter((a) => a.answer === "mine").length;
    const partner_count = catAnswers.filter((a) => a.answer === "partner").length;
    const shared_count = catAnswers.filter((a) => a.answer === "shared").length;
    const unanswered_count = catQuestions.length - catAnswers.length;

    // Count conflicts: both user and partner said "mine" for the same question
    let conflict_count = 0;
    if (hasPartner) {
      catAnswers.forEach((myAnswer) => {
        if (myAnswer.answer === "mine") {
          const partnerAnswer = partnerAnswers.find(
            (pa) => pa.question_id === myAnswer.question_id
          );
          if (partnerAnswer?.answer === "mine") {
            conflict_count++;
          }
        }
      });
    }

    return {
      ...cat,
      total_questions: catQuestions.length,
      mine_count,
      partner_count,
      shared_count,
      unanswered_count,
      conflict_count,
    };
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Balls</h1>
        <p className="text-muted-foreground mt-1">
          Tap a category to see the details.
        </p>
      </div>

      {/* Partner prompt if not partnered yet */}
      {!hasPartner && (
        <div className="mb-6 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Want to compare answers with your partner?{" "}
            <a
              href="/partner"
              className="font-semibold underline underline-offset-2"
            >
              Set up partner link →
            </a>
          </p>
        </div>
      )}

      {/* Category cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categoriesWithStats.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            hasPartner={hasPartner}
          />
        ))}
      </div>
    </div>
  );
}
