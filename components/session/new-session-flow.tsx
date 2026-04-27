"use client";

import { useState, useTransition } from "react";
import { MultiChoicePrompt, type MultiChoiceSelection } from "./multi-choice-prompt";
import { CategoryMultiSelect } from "./category-multiselect";
import { createSession } from "@/actions/sessions";
import { CUSTOM_KEY, CATEGORY_SCENARIO_PROMPTS } from "@/lib/session-options";
import type { Category, Scenario } from "@/lib/types";

type Props = {
  categories: Category[];
  topScenarios: Scenario[];
  scenariosByCategoryId: Record<string, Scenario[]>;
};

type Step = "top" | "categories" | "focal";

/**
 * Selection funnel orchestrator: top scenario → categories → focal scenario.
 * Holds all state in memory; only persists when the user submits the final step.
 */
export function NewSessionFlow({
  categories,
  topScenarios,
  scenariosByCategoryId,
}: Props) {
  const [step, setStep] = useState<Step>("top");
  const [topSelection, setTopSelection] = useState<MultiChoiceSelection | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [focalSelection, setFocalSelection] = useState<MultiChoiceSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const focalCategoryId = selectedCategoryIds[0];
  const focalCategory = categories.find((c) => c.id === focalCategoryId);
  const focalScenarios = focalCategoryId
    ? scenariosByCategoryId[focalCategoryId] ?? []
    : [];

  const submit = (focal: MultiChoiceSelection) => {
    if (isPending) return;
    if (!topSelection || !focalCategoryId) return;

    const toScenarioChoice = (sel: MultiChoiceSelection, list: Scenario[]) =>
      sel.key === CUSTOM_KEY
        ? { scenarioId: null, customText: sel.customText }
        : { scenarioId: list.find((s) => s.id === sel.key)?.id ?? null, customText: null };

    setError(null);
    startTransition(async () => {
      const result = await createSession({
        topScenario: toScenarioChoice(topSelection, topScenarios),
        selectedCategoryIds,
        focalCategoryId,
        focalScenario: toScenarioChoice(focal, focalScenarios),
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <ProgressIndicator step={step} />

      {step === "top" && (
        <MultiChoicePrompt
          prompt="What's been coming up for you lately?"
          subPrompt="Pick whatever rings true. You can be specific too."
          options={topScenarios.map((s) => ({ key: s.id, label: s.scenario_text }))}
          allowCustom
          initial={topSelection}
          onContinue={(sel) => {
            setTopSelection(sel);
            setStep("categories");
          }}
        />
      )}

      {step === "categories" && (
        <CategoryMultiSelect
          categories={categories}
          initialSelectedIds={selectedCategoryIds}
          onContinue={(ids) => {
            setSelectedCategoryIds(ids);
            setFocalSelection(null);
            setStep("focal");
          }}
        />
      )}

      {step === "focal" && focalCategory && (
        <MultiChoicePrompt
          prompt={
            CATEGORY_SCENARIO_PROMPTS[focalCategory.slug] ??
            `What's been coming up around ${focalCategory.name.toLowerCase()}?`
          }
          subPrompt={
            selectedCategoryIds.length > 1
              ? `We'll focus on ${focalCategory.name} for this session. You can run another session later for the others.`
              : undefined
          }
          options={focalScenarios.map((s) => ({ key: s.id, label: s.scenario_text }))}
          allowCustom
          continueLabel={isPending ? "Starting session..." : "Start session"}
          disabled={isPending}
          initial={focalSelection}
          onContinue={(sel) => {
            setFocalSelection(sel);
            submit(sel);
          }}
        />
      )}

      <div className="flex justify-between items-center mt-6">
        {step !== "top" ? (
          <button
            type="button"
            onClick={() => {
              if (step === "categories") setStep("top");
              else if (step === "focal") setStep("categories");
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
  const steps: Step[] = ["top", "categories", "focal"];
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
