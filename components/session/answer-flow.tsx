"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MultiChoicePrompt,
  type MultiChoiceSelection,
} from "./multi-choice-prompt";
import { submitResponse } from "@/actions/sessions";
import {
  WHO_OPTIONS,
  WHY_OPTIONS,
  EXPECTATION_OPTIONS,
  CUSTOM_KEY,
  type WhoOption,
} from "@/lib/session-options";

type Props = {
  sessionId: string;
  focalScenarioText: string;
};

type Step = "who" | "why" | "expectation";

/**
 * Three-prompt wizard: Who has the ball? → Why? → What are you waiting for?
 * Submits all three in one server call after the final step.
 */
export function AnswerFlow({ sessionId, focalScenarioText }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("who");

  const [who, setWho] = useState<MultiChoiceSelection | null>(null);
  const [why, setWhy] = useState<MultiChoiceSelection | null>(null);
  const [expectation, setExpectation] = useState<MultiChoiceSelection | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (finalExpectation: MultiChoiceSelection) => {
    if (isPending) return;
    if (!who || !why) return;
    setError(null);
    startTransition(async () => {
      const result = await submitResponse({
        sessionId,
        whoHasBall: who.key as WhoOption,
        why: why.key,
        whyCustom: why.customText,
        expectation: finalExpectation.key,
        expectationCustom: finalExpectation.customText,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl border bg-secondary/30 p-4 mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          The ball
        </p>
        <p className="font-medium">{focalScenarioText}</p>
      </div>

      <ProgressIndicator step={step} />

      {step === "who" && (
        <MultiChoicePrompt
          prompt="In this area, who has the ball?"
          options={WHO_OPTIONS}
          initial={who}
          onContinue={(sel) => {
            setWho(sel);
            setStep("why");
          }}
        />
      )}

      {step === "why" && (
        <MultiChoicePrompt
          prompt="What makes you feel that way?"
          options={WHY_OPTIONS}
          allowCustom
          customLabel="Something else (write your own)"
          initial={why}
          onContinue={(sel) => {
            setWhy(sel);
            setStep("expectation");
          }}
        />
      )}

      {step === "expectation" && (
        <MultiChoicePrompt
          prompt="What are you waiting for the other person to do?"
          options={EXPECTATION_OPTIONS}
          allowCustom
          customLabel="Something else (write your own)"
          continueLabel={isPending ? "Submitting..." : "Submit"}
          disabled={isPending}
          initial={expectation}
          onContinue={(sel) => {
            setExpectation(sel);
            submit(sel);
          }}
        />
      )}

      <div className="flex justify-between items-center mt-6">
        {step !== "who" ? (
          <button
            type="button"
            onClick={() => {
              if (step === "why") setStep("who");
              else if (step === "expectation") setStep("why");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}

function ProgressIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["who", "why", "expectation"];
  const currentIndex = steps.indexOf(step);
  return (
    <div className="flex gap-2 mb-8">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= currentIndex ? "bg-primary" : "bg-secondary"
          }`}
        />
      ))}
    </div>
  );
}

// CUSTOM_KEY is exported for callers that need to detect custom answers.
export { CUSTOM_KEY };
