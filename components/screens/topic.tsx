import { Column, Kicker, ListOption, PrimaryButton, Screen, Title } from "@/components/ui";
import { CATEGORIES, findCategory } from "@/lib/content";
import type { ScreenProps } from "./types";

export function TopicScreen({ state, dispatch }: ScreenProps) {
  const category = findCategory(state.categorySlug);

  return (
    <Screen>
      <Column className="gap-4.5">
        <Kicker>Step 2 · Decide together</Kicker>
        <Title>What&apos;s been piling up?</Title>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((c) => {
            const on = c.slug === state.categorySlug;
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={on}
                onClick={() => dispatch({ type: "pickCategory", slug: c.slug })}
                className={`flex min-h-[72px] cursor-pointer flex-col items-start gap-1 rounded-md border-[1.5px] px-4.5 py-3.5 text-left ${
                  on ? "border-ink bg-ink text-on-accent" : "border-line bg-transparent text-ink"
                }`}
              >
                <span className="font-display text-[26px] leading-none font-bold uppercase">{c.name}</span>
                <span className="text-sm opacity-85">{c.description}</span>
              </button>
            );
          })}
        </div>
      </Column>

      <Column className="gap-2.5">
        {category ? (
          <>
            <h2 id="scenario-prompt" className="mb-1.5 font-mono text-xs font-medium tracking-[0.12em] text-muted uppercase">
              {category.prompt}
            </h2>
            <div role="radiogroup" aria-labelledby="scenario-prompt" className="flex flex-col border-t-[1.5px] border-ink">
              {category.scenarios.map((s) => (
                <ListOption
                  key={s.id}
                  label={s.text}
                  checked={s.id === state.scenarioId}
                  onSelect={() => dispatch({ type: "pickScenario", id: s.id })}
                />
              ))}
            </div>
            <PrimaryButton
              className="mt-3.5"
              disabled={!state.scenarioId}
              onClick={() => dispatch({ type: "confirmTopic" })}
            >
              This one
            </PrimaryButton>
          </>
        ) : (
          <p className="border-t border-line py-5 text-base leading-normal text-muted">
            Pick an area first, then the thing inside it you want to talk about.
          </p>
        )}
      </Column>
    </Screen>
  );
}
