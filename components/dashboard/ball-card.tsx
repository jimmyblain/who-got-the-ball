"use client";

/**
 * BallCard — shows a single question/responsibility as a "ball" card.
 * Displays who owns it, whether there's a conflict, and actions like editing or passing.
 * Used on the category detail page (/dashboard/[slug]).
 */

import { useState } from "react";
import { upsertAnswer } from "@/actions/answers";
import { requestTransfer } from "@/actions/transfers";
import { Button } from "@/components/ui/button";
import type { AnswerValue, QuestionWithAnswer } from "@/lib/types";

type BallCardProps = {
  question: QuestionWithAnswer;
  categoryColor: string;
  hasPartner: boolean;
};

export function BallCard({ question, categoryColor, hasPartner }: BallCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);
  const [passMessage, setPassMessage] = useState("");

  // Labels and emojis for each answer type
  const answerDisplay: Record<AnswerValue, { label: string; emoji: string }> = {
    mine: { label: "My ball", emoji: "🙋" },
    partner: { label: "Partner's ball", emoji: "🙋‍♂️" },
    shared: { label: "Shared", emoji: "🤝" },
  };

  // Handle changing an answer
  const handleAnswer = async (answer: AnswerValue) => {
    setSaving(true);
    await upsertAnswer(question.id, answer);
    setSaving(false);
    setIsEditing(false);
  };

  // Handle passing the ball to partner
  const handlePass = async () => {
    setSaving(true);
    await requestTransfer(question.id, passMessage || undefined);
    setSaving(false);
    setShowPassForm(false);
    setPassMessage("");
  };

  const currentAnswer = question.answer;
  const display = currentAnswer ? answerDisplay[currentAnswer] : null;

  return (
    <div
      className={`
        rounded-2xl border bg-card p-5 shadow-sm transition-all
        ${question.has_conflict ? "animate-pulse-border border-red-400" : ""}
      `}
    >
      {/* Question text */}
      <p className="font-medium mb-3">{question.question_text}</p>

      {/* Current answer display */}
      {display && !isEditing ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bob">{display.emoji}</span>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor: `${categoryColor}20`,
                color: categoryColor,
              }}
            >
              {display.label}
            </span>
          </div>

          <div className="flex gap-2">
            {/* Edit button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>

            {/* Pass the ball button — only show if it's "mine" and user has a partner */}
            {currentAnswer === "mine" && hasPartner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassForm(true)}
                disabled={!!question.pending_transfer}
              >
                {question.pending_transfer ? "Transfer pending..." : "Pass ball"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        // Editing mode — show the three answer buttons
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(["mine", "partner", "shared"] as AnswerValue[]).map((value) => {
              const opt = answerDisplay[value];
              const isSelected = currentAnswer === value;
              return (
                <button
                  key={value}
                  onClick={() => handleAnswer(value)}
                  disabled={saving}
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm
                    hover:scale-105 active:scale-95
                    ${isSelected ? "shadow-md" : "border-transparent bg-secondary"}
                  `}
                  style={
                    isSelected
                      ? { borderColor: categoryColor, backgroundColor: `${categoryColor}15` }
                      : {}
                  }
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Partner's answer (shown when partnered) */}
      {hasPartner && question.partner_answer && !isEditing && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            Partner says: {answerDisplay[question.partner_answer].emoji}{" "}
            {answerDisplay[question.partner_answer].label}
          </span>
        </div>
      )}

      {/* Mismatch warning — answers don't align, worth discussing */}
      {question.has_conflict && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            Your answers don&apos;t match — this might be worth discussing together.
          </p>
        </div>
      )}

      {/* Pass the ball form */}
      {showPassForm && (
        <div className="mt-3 p-4 rounded-xl bg-secondary space-y-3">
          <p className="text-sm font-medium">
            Pass this ball to your partner?
          </p>
          <textarea
            value={passMessage}
            onChange={(e) => setPassMessage(e.target.value)}
            placeholder="Add a message (optional)..."
            className="w-full p-2 rounded-lg border bg-background text-sm resize-none h-20"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePass} disabled={saving}>
              {saving ? "Sending..." : "Send request"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPassForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
