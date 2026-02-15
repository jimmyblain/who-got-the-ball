import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { BallCard } from "@/components/dashboard/ball-card";
import type { QuestionWithAnswer, AnswerValue } from "@/lib/types";

/**
 * Category Detail Page — shows all questions within a single category.
 * This is where users see each "ball" (responsibility), who owns it,
 * and can edit answers or pass balls to their partner.
 *
 * The [slug] in the URL tells us which category to show.
 * For example: /dashboard/finances → shows all finance questions.
 */
export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Look up the category by its URL slug
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) notFound();

  // Get user's profile for partner info
  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  const hasPartner = !!profile?.partner_id;

  // Get all questions in this category
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("category_id", category.id)
    .order("sort_order");

  // Get user's answers for these questions
  const { data: myAnswers } = await supabase
    .from("answers")
    .select("*")
    .eq("user_id", user.id);

  // Get partner's answers (if partnered)
  let partnerAnswers: { question_id: string; answer: AnswerValue }[] = [];
  if (hasPartner) {
    const { data } = await supabase
      .from("answers")
      .select("question_id, answer")
      .eq("user_id", profile!.partner_id!);
    if (data) partnerAnswers = data as { question_id: string; answer: AnswerValue }[];
  }

  // Get pending transfers
  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .eq("status", "pending")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

  if (!questions) return <p>Error loading questions.</p>;

  // Combine questions with answers and conflict/transfer info
  const questionsWithAnswers: QuestionWithAnswer[] = questions.map((q) => {
    const myAnswer = myAnswers?.find((a) => a.question_id === q.id);
    const partnerAnswer = partnerAnswers.find((a) => a.question_id === q.id);
    const pendingTransfer = transfers?.find(
      (t) => t.question_id === q.id && t.status === "pending"
    );

    // Check if answers are mismatched (needs discussion).
    // Agreement = both "shared", or mine+partner, or partner+mine.
    // Everything else (including one-sided) = mismatch.
    let has_conflict = false;
    if (myAnswer?.answer && partnerAnswer?.answer) {
      const mine = myAnswer.answer as AnswerValue;
      const theirs = partnerAnswer.answer as AnswerValue;
      const isAgreement =
        (mine === "shared" && theirs === "shared") ||
        (mine === "mine" && theirs === "partner") ||
        (mine === "partner" && theirs === "mine");
      has_conflict = !isAgreement;
    } else if (myAnswer?.answer || partnerAnswer?.answer) {
      // One person answered but not the other — flag it
      has_conflict = true;
    }

    return {
      ...q,
      answer: myAnswer?.answer as AnswerValue | undefined,
      partner_answer: partnerAnswer?.answer as AnswerValue | undefined,
      has_conflict,
      pending_transfer: pendingTransfer || null,
    };
  });

  return (
    <div>
      {/* Back link + category header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to dashboard
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h1 className="text-2xl font-bold">{category.name}</h1>
        </div>
      </div>

      {/* Ball cards — one per question */}
      <div className="space-y-4">
        {questionsWithAnswers.map((question) => (
          <BallCard
            key={question.id}
            question={question}
            categoryColor={category.color}
            hasPartner={hasPartner}
          />
        ))}
      </div>
    </div>
  );
}
