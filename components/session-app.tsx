"use client";

import { useEffect, useReducer, useRef } from "react";
import { initialState, sessionReducer } from "@/lib/session";
import { NamesScreen } from "./screens/names";
import { PassScreen } from "./screens/pass";
import { RevealScreen } from "./screens/reveal";
import { StartScreen } from "./screens/start";
import { TopicScreen } from "./screens/topic";
import { TurnScreen } from "./screens/turn";

const SCREENS = {
  start: StartScreen,
  names: NamesScreen,
  topic: TopicScreen,
  pass: PassScreen,
  turn: TurnScreen,
  reveal: RevealScreen,
};

/**
 * The whole one-phone session runs here, on a single page. Moving between
 * steps changes in-memory state only, so the browser's back button leaves the
 * app rather than stepping into the other person's answers.
 */
export function SessionApp() {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  const isFirstRender = useRef(true);

  // Each step and question is a new "page": start at the top and move focus to
  // its title so screen readers announce it.
  const screenKey = `${state.step}-${state.turn}-${state.question}`;
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("[data-screen-title]")?.focus({ preventScroll: true });
  }, [screenKey]);

  const Current = SCREENS[state.step];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line px-[clamp(20px,4vw,56px)] py-4">
        <span className="font-display text-[22px] leading-[0.9] font-extrabold uppercase">
          Who&apos;s got
          <br />
          the ball
        </span>
        {state.step !== "start" && (
          <button
            type="button"
            onClick={() => {
              if (state.step === "names" || window.confirm("Start over? Everything on this phone will be cleared.")) {
                dispatch({ type: "reset" });
              }
            }}
            className="min-h-11 cursor-pointer bg-transparent p-0 font-mono text-xs tracking-[0.1em] text-muted"
          >
            START OVER
          </button>
        )}
      </header>
      <Current state={state} dispatch={dispatch} />
    </div>
  );
}
