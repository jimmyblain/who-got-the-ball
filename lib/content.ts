/**
 * Everything the quiz asks, in one place.
 *
 * The MVP runs on one phone with no accounts or database, so content ships
 * with the code. The shapes mirror the old `categories` and `scenarios`
 * tables so this can move back into the database when accounts return.
 *
 * Stored keys are stable; labels can be reworded freely.
 */

export type Scenario = {
  id: string;
  text: string;
};

export type Category = {
  slug: "finances" | "household" | "emotional";
  name: string;
  description: string;
  prompt: string;
  scenarios: Scenario[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "finances",
    name: "Finances",
    description: "Money decisions, bills, or who handles what",
    prompt: "What's been coming up around money?",
    scenarios: [
      { id: "finances-spending", text: "We don't agree how to spend money" },
      { id: "finances-bills", text: "Paying the bills" },
      { id: "finances-carrying-more", text: "I feel like I'm carrying more of the financial responsibility" },
      { id: "finances-follow-through", text: "They don't follow through on financial commitments" },
      { id: "finances-avoid-talking", text: "We avoid talking about money" },
      { id: "finances-who-does-what", text: "I don't know who's responsible for what financially" },
    ],
  },
  {
    slug: "household",
    name: "Household",
    description: "Cleaning, chores, or things that need to get done",
    prompt: "What's been coming up at home?",
    scenarios: [
      { id: "household-clean", text: "Keeping the space clean" },
      { id: "household-kitchen", text: "Doing the dishes / kitchen responsibilities" },
      { id: "household-laundry", text: "Laundry not getting done" },
      { id: "household-chores", text: "General chores not being shared" },
      { id: "household-reminding", text: "Having to remind them about tasks" },
    ],
  },
  {
    slug: "emotional",
    name: "Emotional",
    description: "How you talk, show up, and support each other",
    prompt: "What's been coming up in how you relate to each other?",
    scenarios: [
      { id: "emotional-same-argument", text: "Having the same argument over and over" },
      { id: "emotional-tension", text: "Bringing things up leads to tension" },
      { id: "emotional-shuts-down", text: "One of us shuts down during conversations" },
      { id: "emotional-unheard", text: "Feeling unheard or misunderstood" },
      { id: "emotional-avoiding", text: "Avoiding difficult conversations" },
    ],
  },
];

/**
 * Who has the ball. On one phone both people answer from the same screen, so
 * the options are the two names rather than "Me" / "You". The keys point at a
 * player slot, which means two answers can be compared directly.
 */
export type WhoKey = "player_a" | "player_b" | "both_dropped" | "not_sure";

export function whoOptions(names: { a: string; b: string }): { key: WhoKey; label: string }[] {
  return [
    { key: "player_a", label: names.a },
    { key: "player_b", label: names.b },
    { key: "both_dropped", label: "We both let it drop" },
    { key: "not_sure", label: "I'm not sure" },
  ];
}

export const WHY_OPTIONS = [
  { key: "no_follow_through", label: "They don't follow through" },
  { key: "have_to_remind", label: "I have to keep reminding them" },
  { key: "avoid_conversation", label: "They avoid the conversation" },
  { key: "doing_more", label: "I feel like I'm doing more" },
  { key: "expect_me_to_handle", label: "They expect me to handle it" },
  { key: "unclear_responsibility", label: "It's unclear who's responsible" },
] as const;

export const EXPECTATION_OPTIONS = [
  { key: "take_initiative", label: "Take initiative without being asked" },
  { key: "communicate_clearly", label: "Communicate clearly" },
  { key: "follow_through", label: "Follow through on what they said" },
  { key: "acknowledge_role", label: "Acknowledge their role" },
  { key: "stop_avoiding", label: "Stop avoiding the ball" },
  { key: "meet_halfway", label: "Meet me halfway" },
] as const;

export type WhyKey = (typeof WHY_OPTIONS)[number]["key"];
export type ExpectationKey = (typeof EXPECTATION_OPTIONS)[number]["key"];

export type Answers = {
  who?: WhoKey;
  why?: WhyKey;
  expectation?: ExpectationKey;
};

export type QuestionKey = keyof Answers;

/** The three questions each person answers, in order. */
export const QUESTIONS: { key: QuestionKey; title: string; revealLabel: string }[] = [
  { key: "who", title: "Who's holding this right now?", revealLabel: "Who" },
  { key: "why", title: "Why does it feel that way?", revealLabel: "Why" },
  { key: "expectation", title: "What would help most?", revealLabel: "Hoping for" },
];

export function questionOptions(
  key: QuestionKey,
  names: { a: string; b: string },
): readonly { key: string; label: string }[] {
  if (key === "who") return whoOptions(names);
  if (key === "why") return WHY_OPTIONS;
  return EXPECTATION_OPTIONS;
}

export function findCategory(slug: string | null): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function findScenario(id: string | null): Scenario | undefined {
  return CATEGORIES.flatMap((c) => c.scenarios).find((s) => s.id === id);
}

/** Conversation starters shown with the reveal. */
export const CONVERSATION_STARTERS = [
  "I think I've been feeling like you were putting the ball on me, and I don't really know how to respond.",
  "I think I've been waiting for you to take the ball on this, but I haven't clearly said that.",
] as const;
