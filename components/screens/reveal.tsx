"use client";

import { useEffect, useState } from "react";
import { Kicker, PrimaryButton, SecondaryButton, Tag } from "@/components/ui";
import { CONVERSATION_STARTERS, QUESTIONS, findScenario, questionOptions } from "@/lib/content";
import type { ScreenProps } from "./types";

const TIMER_SECONDS = 120;

export function RevealScreen({ state, dispatch }: ScreenProps) {
  const { names, answers } = state;

  const rows = QUESTIONS.map((q) => {
    const options = questionOptions(q.key, names);
    const label = (key?: string) => options.find((o) => o.key === key)?.label ?? "";
    const a = answers[0][q.key];
    const b = answers[1][q.key];
    return { q, a: label(a), b: label(b), same: a !== undefined && a === b };
  });
  const anyCommon = rows.some((r) => r.same);

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start gap-[clamp(28px,4vw,56px)] px-[clamp(20px,4vw,56px)] pt-[clamp(28px,5vw,64px)] pb-10">
      <section className="flex min-w-0 flex-[999_1_540px] flex-col">
        <span className="mb-3.5">
          {/* Keeps the topic in view while the two of you talk it through. */}
          <Kicker>{findScenario(state.scenarioId)?.text}</Kicker>
        </span>
        <h1
          tabIndex={-1}
          data-screen-title
          className="mb-[clamp(20px,3vw,32px)] font-display text-[clamp(52px,6.5vw,96px)] leading-[0.86] font-extrabold uppercase outline-none"
        >
          How you each
          <br />
          see it
        </h1>

        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[28%]" />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr className="border-t-[1.5px] border-b border-t-ink border-b-line font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
              <td className="py-2.5" />
              <th scope="col" className="py-2.5 pl-3.5 font-normal break-words">
                {names.a}
              </th>
              <th scope="col" className="py-2.5 pl-3.5 font-normal break-words">
                {names.b}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.q.key} className="border-b border-line align-top">
                <th scope="row" className="py-4.5 font-normal">
                  <span className="flex flex-col items-start gap-2">
                    <span className="font-display text-xl leading-none font-bold uppercase">{r.q.revealLabel}</span>
                    <Tag kind={r.same ? "common" : "talk"} />
                  </span>
                </th>
                <td className="py-4.5 pl-3.5 text-[clamp(16px,1.6vw,20px)] leading-[1.3] font-medium">{r.a}</td>
                <td className="py-4.5 pl-3.5 text-[clamp(16px,1.6vw,20px)] leading-[1.3] font-medium">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4.5 max-w-[56ch] text-base leading-normal text-muted">
          {anyCommon
            ? "You already share some ground here. Start from that, then talk through where you see it differently."
            : "You see this one differently, and that's exactly why it's worth talking about. Take it slowly."}
        </p>
      </section>

      <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
        <TalkItThrough />
        <PrimaryButton onClick={() => dispatch({ type: "anotherTopic" })}>Talk about something else</PrimaryButton>
        <SecondaryButton onClick={() => dispatch({ type: "reset" })}>We&apos;re done, clear our answers</SecondaryButton>
      </aside>
    </main>
  );
}

function TalkItThrough() {
  const [phrase, setPhrase] = useState(0);
  const [left, setLeft] = useState(TIMER_SECONDS);
  const [running, setRunning] = useState(false);

  // The timer stops by itself at 0:00.
  const ticking = running && left > 0;

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  const toggle = () => {
    if (ticking) return setRunning(false);
    if (left === 0) setLeft(TIMER_SECONDS);
    setRunning(true);
  };

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const toggleLabel = ticking ? "Pause" : left === TIMER_SECONDS || left === 0 ? "Start a 2-min timer" : "Resume";

  return (
    <section className="flex flex-col gap-4 rounded-md border border-line bg-surface p-[clamp(18px,2.4vw,26px)]">
      <h2 className="font-display text-[28px] leading-none font-extrabold uppercase">Talk it through</h2>
      <p className="text-[15px] leading-normal text-muted">
        Take turns. Try to understand before you respond. If you&apos;re stuck, open with this:
      </p>
      <p className="text-[19px] leading-[1.4] font-medium" aria-live="polite">
        &ldquo;{CONVERSATION_STARTERS[phrase]}&rdquo;
      </p>
      <button
        type="button"
        onClick={() => setPhrase((p) => (p + 1) % CONVERSATION_STARTERS.length)}
        className="min-h-11 cursor-pointer self-start bg-transparent p-0 font-mono text-xs tracking-[0.1em] text-accent uppercase"
      >
        Another way to start →
      </button>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3.5">
        <span className="font-display text-[40px] leading-none font-bold tabular-nums" aria-label={`Timer ${clock}`}>
          {clock}
        </span>
        <button
          type="button"
          onClick={toggle}
          className="min-h-11 cursor-pointer rounded-md border-[1.5px] border-ink bg-transparent px-4 font-mono text-xs tracking-[0.1em] text-ink uppercase"
        >
          {toggleLabel}
        </button>
      </div>
    </section>
  );
}
