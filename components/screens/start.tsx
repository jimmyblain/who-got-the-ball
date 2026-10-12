import { PrimaryButton, Screen } from "@/components/ui";
import type { ScreenProps } from "./types";

const STEPS = [
  "Choose a topic together",
  "Take turns answering, privately",
  "See your answers side by side and talk",
];

export function StartScreen({ dispatch }: ScreenProps) {
  return (
    <Screen align="end" className="pt-[clamp(36px,7vw,104px)]">
      <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
        <h1
          tabIndex={-1}
          data-screen-title
          className="font-display text-[clamp(64px,9vw,136px)] leading-[0.84] font-extrabold uppercase outline-none"
        >
          Who&apos;s got
          <br />
          the <span className="text-accent">ball?</span>
        </h1>
        <p className="max-w-[42ch] text-[19px] leading-normal text-muted">
          A ten-minute conversation for two, on one phone. Pick something that&apos;s been piling up,
          answer on your own, then look at it together.
        </p>
      </section>

      <section className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
        <ol className="border-t border-line">
          {STEPS.map((step, i) => (
            <li key={step} className="grid grid-cols-[40px_minmax(0,1fr)] border-b border-line py-3 text-base">
              <span className="pt-[3px] font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
        <PrimaryButton className="min-h-16 text-[26px]" onClick={() => dispatch({ type: "start" })}>
          Let&apos;s start
        </PrimaryButton>
      </section>
    </Screen>
  );
}
