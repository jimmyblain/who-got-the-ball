import { CATEGORIES, QUESTIONS, type Answers, type QuestionKey } from "@/lib/content";

/**
 * One-phone session state. Everything lives in memory on this device;
 * nothing is sent anywhere.
 *
 * Flow: start → names → topic → pass (person one) → turn → pass (person two)
 * → turn → reveal. The same "pass" screen is used before each turn.
 */

export type Step = "start" | "names" | "topic" | "pass" | "turn" | "reveal";

export type Turn = 0 | 1;

export type SessionState = {
  step: Step;
  names: { a: string; b: string };
  categorySlug: string | null;
  scenarioId: string | null;
  /** Whose turn it is: 0 = first person (names.a), 1 = second person (names.b). */
  turn: Turn;
  /** Index into QUESTIONS for the current turn. */
  question: number;
  answers: [Answers, Answers];
};

export type SessionAction =
  | { type: "start" }
  | { type: "setName"; person: "a" | "b"; value: string }
  | { type: "confirmNames" }
  | { type: "pickCategory"; slug: string }
  | { type: "pickScenario"; id: string }
  | { type: "confirmTopic" }
  | { type: "beginTurn" }
  | { type: "answer"; key: QuestionKey; value: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "anotherTopic" }
  | { type: "reset" };

export const MAX_NAME_LENGTH = 20;

export const initialState: SessionState = {
  step: "start",
  names: { a: "", b: "" },
  categorySlug: null,
  scenarioId: null,
  turn: 0,
  question: 0,
  answers: [{}, {}],
};

export function namesReady(names: SessionState["names"]): boolean {
  return names.a.trim() !== "" && names.b.trim() !== "";
}

export function currentAnswer(state: SessionState): string | undefined {
  const key = QUESTIONS[state.question].key;
  return state.answers[state.turn][key];
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "start":
      return { ...state, step: "names" };

    case "setName":
      return {
        ...state,
        names: { ...state.names, [action.person]: action.value.slice(0, MAX_NAME_LENGTH) },
      };

    case "confirmNames":
      if (!namesReady(state.names)) return state;
      return {
        ...state,
        names: { a: state.names.a.trim(), b: state.names.b.trim() },
        step: "topic",
      };

    case "pickCategory":
      if (state.categorySlug === action.slug) return state;
      return { ...state, categorySlug: action.slug, scenarioId: null };

    case "pickScenario": {
      const category = CATEGORIES.find((c) => c.slug === state.categorySlug);
      if (!category?.scenarios.some((s) => s.id === action.id)) return state;
      return { ...state, scenarioId: action.id };
    }

    case "confirmTopic":
      if (!state.scenarioId) return state;
      return { ...state, step: "pass", turn: 0, question: 0, answers: [{}, {}] };

    case "beginTurn":
      return { ...state, step: "turn", question: 0 };

    case "answer": {
      if (state.step !== "turn" || QUESTIONS[state.question].key !== action.key) return state;
      const answers: [Answers, Answers] = [...state.answers];
      answers[state.turn] = { ...answers[state.turn], [action.key]: action.value };
      return { ...state, answers };
    }

    case "next":
      if (state.step !== "turn" || !currentAnswer(state)) return state;
      if (state.question < QUESTIONS.length - 1) return { ...state, question: state.question + 1 };
      if (state.turn === 0) return { ...state, step: "pass", turn: 1, question: 0 };
      return { ...state, step: "reveal" };

    // Only steps back within the current person's own questions, so the second
    // person can never reach the first person's answers.
    case "back":
      if (state.step !== "turn" || state.question === 0) return state;
      return { ...state, question: state.question - 1 };

    case "anotherTopic":
      return {
        ...initialState,
        step: "topic",
        names: state.names,
      };

    case "reset":
      return initialState;
  }
}
