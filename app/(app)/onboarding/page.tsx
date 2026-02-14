"use client";

/**
 * Onboarding Page
 * This is the first thing users see after signing up.
 * It walks them through each category's questions one at a time.
 *
 * Flow:
 * 1. User sees a category header (e.g., "Finances")
 * 2. They answer 5 questions in that category
 * 3. They move to the next category
 * 4. After all categories, onboarding is marked complete → redirect to dashboard
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QuestionCard } from "@/components/onboarding/question-card";
import { completeOnboarding } from "@/actions/answers";
import { Button } from "@/components/ui/button";
import type { Category, Question, AnswerValue } from "@/lib/types";

type CategoryWithQuestions = Category & {
  questions: (Question & { answer?: AnswerValue })[];
};

export default function OnboardingPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryWithQuestions[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  // Load categories, questions, and any existing answers
  const loadData = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch all categories sorted by sort_order
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");

    // Fetch all questions sorted by sort_order
    const { data: questions } = await supabase
      .from("questions")
      .select("*")
      .order("sort_order");

    // Fetch any existing answers (in case user left and came back)
    const { data: answers } = await supabase
      .from("answers")
      .select("*")
      .eq("user_id", user.id);

    if (!cats || !questions) return;

    // Group questions under their categories and attach existing answers
    const categoriesWithQuestions: CategoryWithQuestions[] = cats.map((cat) => ({
      ...cat,
      questions: questions
        .filter((q) => q.category_id === cat.id)
        .map((q) => ({
          ...q,
          answer: answers?.find((a) => a.question_id === q.id)?.answer as
            | AnswerValue
            | undefined,
        })),
    }));

    setCategories(categoriesWithQuestions);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-bob">🏀</div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentCategory = categories[currentCategoryIndex];
  if (!currentCategory) return null;

  // Callback when a QuestionCard saves an answer — update local state
  // so the parent knows all questions are answered (enables "Next" button)
  const handleQuestionAnswer = (questionId: string, answer: AnswerValue) => {
    setCategories((prev) =>
      prev.map((cat, i) =>
        i === currentCategoryIndex
          ? {
              ...cat,
              questions: cat.questions.map((q) =>
                q.id === questionId ? { ...q, answer } : q
              ),
            }
          : cat
      )
    );
  };

  // Check if all questions in the current category are answered
  const allAnswered = currentCategory.questions.every((q) => q.answer);
  const isLastCategory = currentCategoryIndex === categories.length - 1;

  // Handle finishing onboarding
  const handleFinish = async () => {
    setFinishing(true);
    await completeOnboarding();
    router.push("/dashboard");
  };

  // Handle moving to next category
  const handleNext = () => {
    if (isLastCategory) {
      handleFinish();
    } else {
      setCurrentCategoryIndex((prev) => prev + 1);
      // Reload data to get fresh answers
      loadData();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress indicator — shows which category you're on */}
      <div className="flex gap-2 mb-8">
        {categories.map((cat, i) => (
          <div
            key={cat.id}
            className={`h-2 flex-1 rounded-full transition-all ${
              i <= currentCategoryIndex ? "" : "bg-secondary"
            }`}
            style={
              i <= currentCategoryIndex
                ? { backgroundColor: cat.color }
                : {}
            }
          />
        ))}
      </div>

      {/* Category header */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-sm mb-4"
          style={{ backgroundColor: currentCategory.color }}
        >
          {currentCategory.name}
        </div>
        <h1 className="text-2xl font-bold">
          Let&apos;s talk about {currentCategory.name.toLowerCase()}
        </h1>
        <p className="text-muted-foreground mt-2">
          For each question, choose who carries this ball in your relationship.
        </p>
      </div>

      {/* Question cards */}
      <div className="space-y-4 mb-8">
        {currentCategory.questions.map((question, i) => (
          <QuestionCard
            key={question.id}
            questionId={question.id}
            questionText={question.question_text}
            currentAnswer={question.answer}
            categoryColor={currentCategory.color}
            questionNumber={i + 1}
            totalQuestions={currentCategory.questions.length}
            onAnswer={handleQuestionAnswer}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center">
        {/* Back button */}
        {currentCategoryIndex > 0 ? (
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentCategoryIndex((prev) => prev - 1);
              loadData();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            ← Previous
          </Button>
        ) : (
          <div /> // Empty div to maintain spacing
        )}

        {/* Next / Finish button */}
        <Button
          onClick={handleNext}
          disabled={!allAnswered || finishing}
          style={
            allAnswered
              ? { backgroundColor: currentCategory.color }
              : {}
          }
          className="min-w-[140px]"
        >
          {finishing
            ? "Finishing..."
            : isLastCategory
              ? "Finish & see results"
              : `Next: ${categories[currentCategoryIndex + 1]?.name} →`}
        </Button>
      </div>
    </div>
  );
}
