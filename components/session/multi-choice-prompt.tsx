"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CUSTOM_KEY } from "@/lib/session-options";

export type MultiChoiceOption = {
  key: string;
  label: string;
  description?: string;
};

export type MultiChoiceSelection = {
  key: string;
  customText: string | null;
};

type Props = {
  prompt: string;
  subPrompt?: string;
  options: readonly MultiChoiceOption[];
  allowCustom?: boolean;
  customLabel?: string;     // text to show on the "let me type" option
  customPlaceholder?: string;
  continueLabel?: string;
  disabled?: boolean;
  initial?: MultiChoiceSelection | null;
  onContinue: (selection: MultiChoiceSelection) => void;
};

/**
 * Single-choice picker with an optional free-text "custom" answer.
 * Used by the top scenario, per-category scenario, why, and expectation steps.
 */
export function MultiChoicePrompt({
  prompt,
  subPrompt,
  options,
  allowCustom = false,
  customLabel = "Something specific (let me type it)",
  customPlaceholder = "Tell us in your own words...",
  continueLabel = "Continue",
  disabled = false,
  initial,
  onContinue,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(initial?.key ?? null);
  const [customText, setCustomText] = useState<string>(initial?.customText ?? "");

  const isCustom = selectedKey === CUSTOM_KEY;
  const canContinue =
    selectedKey !== null && (!isCustom || customText.trim().length > 0);

  const handleContinue = () => {
    if (!canContinue || selectedKey === null) return;
    onContinue({
      key: selectedKey,
      customText: isCustom ? customText.trim() : null,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{prompt}</h2>
        {subPrompt && (
          <p className="text-muted-foreground mt-1 text-sm">{subPrompt}</p>
        )}
      </div>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelectedKey(opt.key)}
            className={`w-full text-left rounded-xl border p-4 transition-colors ${
              selectedKey === opt.key
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "bg-card hover:bg-secondary/40"
            }`}
          >
            <div className="font-medium">{opt.label}</div>
            {opt.description && (
              <div className="text-sm text-muted-foreground mt-1">
                {opt.description}
              </div>
            )}
          </button>
        ))}

        {allowCustom && (
          <button
            type="button"
            onClick={() => setSelectedKey(CUSTOM_KEY)}
            className={`w-full text-left rounded-xl border p-4 transition-colors ${
              isCustom
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "bg-card hover:bg-secondary/40"
            }`}
          >
            <div className="font-medium">{customLabel}</div>
          </button>
        )}

        {isCustom && (
          <textarea
            autoFocus
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={customPlaceholder}
            className="w-full rounded-xl border bg-background p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={!canContinue || disabled} size="lg">
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
