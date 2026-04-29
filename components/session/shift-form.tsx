"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ACTION_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/session-options";
import { submitAction } from "@/actions/sessions";

type Props = {
  sessionId: string;
  initialAction?: string | null;
  initialLanguage?: string | null;
};

/**
 * Two-picker form for "Make the shift": one action, one language phrase.
 * Shown together on a single screen (per the stakeholder feedback).
 * Pre-fills with the user's previous selections if they're revisiting.
 */
export function ShiftForm({
  sessionId,
  initialAction = null,
  initialLanguage = null,
}: Props) {
  const router = useRouter();
  const [actionKey, setActionKey] = useState<string | null>(initialAction);
  const [languageKey, setLanguageKey] = useState<string | null>(initialLanguage);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    actionKey !== null && languageKey !== null && !isPending;

  const submit = () => {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await submitAction({
        sessionId,
        action: actionKey!,
        language: languageKey!,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        // Phase 6 will route this to /session/[id]/checkin.
        router.push("/dashboard");
      }
    });
  };

  return (
    <div className="space-y-8">
      <Section title="One small action I can take">
        <PickerList
          options={ACTION_OPTIONS}
          selected={actionKey}
          onSelect={setActionKey}
        />
      </Section>

      <Section title="One thing I can say">
        <PickerList
          options={LANGUAGE_OPTIONS}
          selected={languageKey}
          onSelect={setLanguageKey}
        />
      </Section>

      <div className="flex justify-end items-center gap-4">
        {error && <span className="text-sm text-destructive">{error}</span>}
        <Button onClick={submit} disabled={!canSubmit} size="lg">
          {isPending ? "Saving..." : "Continue →"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function PickerList({
  options,
  selected,
  onSelect,
}: {
  options: readonly { key: string; label: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelect(opt.key)}
          className={`w-full text-left rounded-xl border p-4 transition-colors ${
            selected === opt.key
              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
              : "bg-card hover:bg-secondary/40"
          }`}
        >
          <div className="font-medium">{opt.label}</div>
        </button>
      ))}
    </div>
  );
}
