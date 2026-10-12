import { Kicker, PrimaryButton } from "@/components/ui";
import { findScenario } from "@/lib/content";
import type { ScreenProps } from "./types";

/** Shown before each turn so the right person is holding the phone. */
export function PassScreen({ state, dispatch }: ScreenProps) {
  const { a, b } = state.names;
  const first = state.turn === 0;
  const scenario = findScenario(state.scenarioId);
  // Names go in the giant title, so long ones get a smaller size to avoid
  // breaking mid-word on narrow phones.
  const longNames = Math.max(a.length, b.length) > 10;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] grow flex-col gap-6.5 px-[clamp(20px,4vw,56px)] pt-[clamp(40px,8vw,120px)] pb-12">
      <Kicker tone="common">
        {first ? `You picked: ${scenario?.text ?? ""}` : `Thanks, ${a}. Your answers are hidden.`}
      </Kicker>
      <h1
        tabIndex={-1}
        data-screen-title
        className={`font-display leading-[0.84] font-extrabold break-words uppercase outline-none ${
          longNames ? "text-[clamp(40px,8vw,120px)]" : "text-[clamp(64px,10vw,148px)]"
        }`}
      >
        {first ? `${a} goes first.` : "Pass the phone"}
        <br />
        <span className="text-accent">{first ? `${b}, look away.` : `to ${b}.`}</span>
      </h1>
      <p className="max-w-[46ch] text-lg leading-normal text-muted">
        {first
          ? `Hand the phone to ${a}. Three quick questions, then it comes back to ${b} for the same three.`
          : `${b}, you'll answer the same three questions. ${a}'s answers stay hidden until you're both done.`}
      </p>
      <PrimaryButton className="min-h-16 self-start text-[26px]" onClick={() => dispatch({ type: "beginTurn" })}>
        I&apos;m {first ? a : b}, start
      </PrimaryButton>
    </main>
  );
}
