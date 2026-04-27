/**
 * Preset options for the 3-part answer wizard (Who / Why / Expectation).
 *
 * The `key` is what gets stored in the DB. The `label` is what the user sees.
 * Stored keys are stable so analytics queries don't break if labels are reworded.
 * The string `"custom"` is reserved for user-typed answers and is excluded from these lists.
 */

export type WhoOption = "me" | "you" | "both_dropped" | "not_sure";

export const WHO_OPTIONS: { key: WhoOption; label: string; description?: string }[] = [
  { key: "me", label: "Me" },
  { key: "you", label: "You" },
  { key: "both_dropped", label: "Both of us dropped it" },
  { key: "not_sure", label: "Not sure" },
];

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

export const CUSTOM_KEY = "custom" as const;

/**
 * Per-category prompt shown above the scenario picker.
 * Keyed by the category slug (matches `categories.slug` in the DB).
 */
export const CATEGORY_SCENARIO_PROMPTS: Record<string, string> = {
  finances: "What's been coming up around money?",
  household: "What's been coming up at home?",
  emotional: "What's been coming up in how you relate to each other?",
};

/**
 * Look up a label by its stored key. Returns the key as a fallback so we
 * never render an empty string (helpful for legacy / unknown keys).
 */
export function labelFor(
  options: readonly { key: string; label: string }[],
  key: string,
): string {
  return options.find((o) => o.key === key)?.label ?? key;
}
