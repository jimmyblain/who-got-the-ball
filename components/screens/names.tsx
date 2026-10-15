import { Column, PrimaryButton, Screen, Title } from "@/components/ui";
import { MAX_NAME_LENGTH, namesReady } from "@/lib/session";
import type { ScreenProps } from "./types";

const FIELDS = [
  { person: "a", label: "First person" },
  { person: "b", label: "Second person" },
] as const;

export function NamesScreen({ state, dispatch }: ScreenProps) {
  const ready = namesReady(state.names);

  return (
    <Screen>
      <Column className="gap-4.5">
        <Title>Who&apos;s at the table?</Title>
        <p className="max-w-[40ch] text-[17px] leading-normal text-muted">
          First names are enough. They&apos;re only used here, to show whose turn it is and who
          said what.
        </p>
      </Column>

      <form
        className="flex min-w-0 flex-[1_1_360px] flex-col gap-4.5"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: "confirmNames" });
        }}
      >
        {FIELDS.map(({ person, label }) => (
          <div key={person} className="flex flex-col gap-2">
            <label htmlFor={`name-${person}`} className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
              {label}
            </label>
            <input
              id={`name-${person}`}
              type="text"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint={person === "a" ? "next" : "done"}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Name"
              value={state.names[person]}
              onChange={(e) => dispatch({ type: "setName", person, value: e.target.value })}
              className="h-[60px] rounded-md border-[1.5px] border-line bg-surface px-4 font-display text-[28px] font-bold text-ink uppercase placeholder:text-muted/60 focus:border-ink focus:outline-none"
            />
          </div>
        ))}
        <PrimaryButton type="submit" disabled={!ready}>
          Pick a topic
        </PrimaryButton>
      </form>
    </Screen>
  );
}
