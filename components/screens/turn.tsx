import { Column, Kicker, OptionRow, PrimaryButton, Screen, SecondaryButton, Title } from "@/components/ui";
import { QUESTIONS, findScenario, questionOptions } from "@/lib/content";
import { currentAnswer } from "@/lib/session";
import type { ScreenProps } from "./types";

export function TurnScreen({ state, dispatch }: ScreenProps) {
  const { names, turn, question } = state;
  const me = turn === 0 ? names.a : names.b;
  const other = turn === 0 ? names.b : names.a;
  const q = QUESTIONS[question];
  const answer = currentAnswer(state);
  const last = question === QUESTIONS.length - 1;
  const nextLabel = !last ? "Next question" : turn === 0 ? "I'm done" : "See it together";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-[clamp(20px,4vw,56px)] py-3">
        <span className="font-display text-[22px] font-extrabold uppercase">{me}&apos;s turn</span>
        <span className="flex items-center gap-2.5">
          <span className="flex gap-1" aria-hidden="true">
            {QUESTIONS.map((_, i) => (
              <span key={i} className={`h-1 w-7 ${i <= question ? "bg-accent" : "bg-line"}`} />
            ))}
          </span>
          <span className="font-mono text-xs tracking-[0.1em]">
            {question + 1} OF {QUESTIONS.length}
          </span>
        </span>
      </div>

      <Screen>
        <Column className="gap-4">
          {/* The question says "this", so name the topic being answered. */}
          <Kicker>{findScenario(state.scenarioId)?.text}</Kicker>
          <Title>{q.title}</Title>
          <p className="max-w-[40ch] text-base leading-normal text-muted">
            {other} won&apos;t see this until the reveal. Go with your gut.
          </p>
        </Column>

        <Column className="gap-2">
          <div role="radiogroup" aria-label={q.title} className="flex flex-col gap-2">
            {questionOptions(q.key, names).map((o) => (
              <OptionRow
                key={o.key}
                label={o.label}
                checked={answer === o.key}
                onSelect={() => dispatch({ type: "answer", key: q.key, value: o.key })}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {question > 0 && (
              <SecondaryButton className="min-h-[60px]" onClick={() => dispatch({ type: "back" })}>
                Back
              </SecondaryButton>
            )}
            <PrimaryButton className="grow" disabled={!answer} onClick={() => dispatch({ type: "next" })}>
              {nextLabel}
            </PrimaryButton>
          </div>
        </Column>
      </Screen>
    </>
  );
}
