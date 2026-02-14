"use client";

/**
 * QuestionCard — shows a single question with 3 ball-shaped answer buttons.
 * Used during onboarding and can be reused anywhere we need to display a question.
 *
 * The three answers are:
 * - "mine" = This is my ball (I'm responsible)
 * - "partner" = This is my partner's ball
 * - "shared" = We share this ball
 */

import { useState } from "react";
import { upsertAnswer } from "@/actions/answers";
import type { AnswerValue } from "@/lib/types";

type QuestionCardProps = {
  questionId: string;
  questionText: string;
  currentAnswer?: AnswerValue;
  categoryColor: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer?: (questionId: string, answer: AnswerValue) => void;
};

export function QuestionCard({
  questionId,
  questionText,
  currentAnswer,
  categoryColor,
  questionNumber,
  totalQuestions,
  onAnswer,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<AnswerValue | undefined>(
    currentAnswer
  );
  const [saving, setSaving] = useState(false);

  // Handle clicking an answer button
  const handleAnswer = async (answer: AnswerValue) => {
    setSelected(answer);
    setSaving(true);
    // Notify parent immediately so it can enable the "Next" button
    onAnswer?.(questionId, answer);
    await upsertAnswer(questionId, answer);
    setSaving(false);
  };

  // Configuration for each answer option
  const options: { value: AnswerValue; label: string; emoji: string }[] = [
    { value: "mine", label: "My ball", emoji: "🙋" },
    { value: "partner", label: "Partner's ball", emoji: "🙋‍♂️" },
    { value: "shared", label: "We share", emoji: "🤝" },
  ];

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border">
      {/* Question number indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full text-white"
          style={{ backgroundColor: categoryColor }}
        >
          {questionNumber} / {totalQuestions}
        </span>
        {saving && (
          <span className="text-xs text-muted-foreground">Saving...</span>
        )}
      </div>

      {/* The question text */}
      <h3 className="text-lg font-medium mb-6">{questionText}</h3>

      {/* Three answer buttons — styled like colorful balls */}
      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              disabled={saving}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                hover:scale-105 active:scale-95
                ${
                  isSelected
                    ? "border-current shadow-lg scale-105"
                    : "border-transparent bg-secondary hover:border-muted-foreground/20"
                }
              `}
              style={
                isSelected ? { borderColor: categoryColor, backgroundColor: `${categoryColor}15` } : {}
              }
            >
              {/* Ball emoji */}
              <span className={`text-3xl ${isSelected ? "animate-bob" : ""}`}>
                {option.emoji}
              </span>
              {/* Label */}
              <span
                className={`text-sm font-medium ${isSelected ? "" : "text-muted-foreground"}`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
