"use client";

/**
 * AlignmentCard — A card on the Alignment page showing a discussion item
 * with both partners' answers side by side and inline action buttons.
 *
 * Actions available:
 * - "Edit answer" — lets you change your answer right from this page
 * - "Pass the ball" — opens a mini form to request a transfer to your partner
 *
 * This makes it easy to resolve mismatches without navigating to the
 * category detail page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertAnswer } from "@/actions/answers";
import { requestTransfer } from "@/actions/transfers";
import { Button } from "@/components/ui/button";
import type { AnswerValue } from "@/lib/types";

type AlignmentCardProps = {
  questionId: string;
  questionText: string;
  categoryColor: string;
  categorySlug: string;
  myAnswer: AnswerValue | null;
  partnerAnswer: AnswerValue | null;
  answerLabels: Record<AnswerValue, string>;
  answerEmojis: Record<AnswerValue, string>;
  type: "discussion" | "agreement";
};

export function AlignmentCard({
  questionId,
  questionText,
  categoryColor,
  categorySlug,
  myAnswer,
  partnerAnswer,
  answerLabels,
  answerEmojis,
  type,
}: AlignmentCardProps) {
  const router = useRouter();
  // Whether the user is editing their answer inline
  const [isEditing, setIsEditing] = useState(false);
  // Whether we're saving something to the server
  const [saving, setSaving] = useState(false);
  // Whether the "pass the ball" mini form is showing
  const [showPassForm, setShowPassForm] = useState(false);
  // Optional message when passing a ball
  const [passMessage, setPassMessage] = useState("");

  /**
   * Handle changing the user's answer inline.
   * After saving, we refresh the page to update the comparison.
   */
  const handleAnswer = async (answer: AnswerValue) => {
    setSaving(true);
    await upsertAnswer(questionId, answer);
    setSaving(false);
    setIsEditing(false);
    // Refresh the page so the server re-computes the comparison
    router.refresh();
  };

  /**
   * Handle requesting a transfer ("pass the ball") to the partner.
   */
  const handlePass = async () => {
    setSaving(true);
    await requestTransfer(questionId, passMessage || undefined);
    setSaving(false);
    setShowPassForm(false);
    setPassMessage("");
    router.refresh();
  };

  /**
   * Describe why this is a mismatch in plain language.
   * Helps users understand what the disagreement actually is.
   */
  const getMismatchDescription = (): string => {
    if (!myAnswer && partnerAnswer) return "Your partner answered, but you haven't yet.";
    if (myAnswer && !partnerAnswer) return "You answered, but your partner hasn't yet.";
    if (myAnswer === "mine" && partnerAnswer === "mine")
      return "You both feel this is your responsibility.";
    if (myAnswer === "partner" && partnerAnswer === "partner")
      return "You both think the other person handles this.";
    if (myAnswer === "shared" && partnerAnswer !== "shared")
      return "You think this is shared, but your partner disagrees.";
    if (myAnswer !== "shared" && partnerAnswer === "shared")
      return "Your partner thinks this is shared, but you disagree.";
    return "You have different views on who owns this.";
  };

  return (
    <div
      className={`
        rounded-2xl border bg-card p-5 shadow-sm transition-all
        ${type === "discussion" ? "border-amber-200 dark:border-amber-800" : "border-green-200 dark:border-green-800"}
      `}
    >
      {/* Question text */}
      <p className="font-medium mb-3">{questionText}</p>

      {/* Both answers side by side */}
      <div className="flex gap-4 mb-3">
        {/* My answer */}
        <div className="flex-1 rounded-xl bg-secondary/50 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">You</p>
          {myAnswer ? (
            <p className="text-sm font-medium">
              {answerEmojis[myAnswer]} {answerLabels[myAnswer]}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not answered</p>
          )}
        </div>

        {/* Partner's answer */}
        <div className="flex-1 rounded-xl bg-secondary/50 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Partner</p>
          {partnerAnswer ? (
            <p className="text-sm font-medium">
              {answerEmojis[partnerAnswer]} {answerLabels[partnerAnswer]}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not answered</p>
          )}
        </div>
      </div>

      {/* Mismatch explanation (only for discussion items) */}
      {type === "discussion" && (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 mb-3">
          {getMismatchDescription()}
        </p>
      )}

      {/* Inline editing UI — shown when user clicks "Edit answer" */}
      {isEditing ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Change your answer:</p>
          <div className="grid grid-cols-3 gap-2">
            {(["mine", "partner", "shared"] as AnswerValue[]).map((value) => {
              const isSelected = myAnswer === value;
              return (
                <button
                  key={value}
                  onClick={() => handleAnswer(value)}
                  disabled={saving}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs
                    hover:scale-105 active:scale-95
                    ${isSelected ? "shadow-md" : "border-transparent bg-secondary"}
                  `}
                  style={
                    isSelected
                      ? { borderColor: categoryColor, backgroundColor: `${categoryColor}15` }
                      : {}
                  }
                >
                  <span className="text-lg">{answerEmojis[value]}</span>
                  <span className="font-medium">{answerLabels[value]}</span>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : showPassForm ? (
        /* Pass the ball form */
        <div className="space-y-3 p-3 rounded-xl bg-secondary">
          <p className="text-sm font-medium">Pass this ball to your partner?</p>
          <textarea
            value={passMessage}
            onChange={(e) => setPassMessage(e.target.value)}
            placeholder="Add a message (optional)..."
            className="w-full p-2 rounded-lg border bg-background text-sm resize-none h-16"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePass} disabled={saving}>
              {saving ? "Sending..." : "Send request"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPassForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Action buttons — shown when not editing */
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit answer
          </Button>
          {myAnswer === "mine" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPassForm(true)}
            >
              Pass the ball
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
