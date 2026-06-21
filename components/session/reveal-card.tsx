import {
  WHY_OPTIONS,
  EXPECTATION_OPTIONS,
  CUSTOM_KEY,
  labelFor,
  type WhoOption,
} from "@/lib/session-options";
import type { SessionResponse } from "@/lib/types";

type Signal = "orange" | "blue" | "red";

type Props = {
  focalScenarioText: string;
  viewerResponse: SessionResponse;
  partnerResponse: SessionResponse;
  viewerName: string;
  partnerName: string;
};

/**
 * Side-by-side reveal of both partners' Who/Why/Expectation answers.
 *
 * Color signal (per stakeholder feedback — see plan note about edge cases):
 *  - orange: both partners point to the same person as the ball-holder
 *  - red:    neither partner identifies a holder (both dropped / both unsure)
 *  - blue:   different perspectives (everything else)
 */
export function RevealCard({
  focalScenarioText,
  viewerResponse,
  partnerResponse,
  viewerName,
  partnerName,
}: Props) {
  const signal = computeSignal(
    viewerResponse.who_has_ball,
    partnerResponse.who_has_ball,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-secondary/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          The ball
        </p>
        <p className="font-medium">{focalScenarioText}</p>
      </div>

      <SignalCallout signal={signal} partnerName={partnerName} />

      <div className="grid gap-4 sm:grid-cols-2">
        <ResponseColumn
          label="You said"
          response={viewerResponse}
          responderIsViewer
          viewerName={viewerName}
          partnerName={partnerName}
        />
        <ResponseColumn
          label={`${partnerName} said`}
          response={partnerResponse}
          responderIsViewer={false}
          viewerName={viewerName}
          partnerName={partnerName}
        />
      </div>
    </div>
  );
}

function ResponseColumn({
  label,
  response,
  responderIsViewer,
  viewerName,
  partnerName,
}: {
  label: string;
  response: SessionResponse;
  responderIsViewer: boolean;
  viewerName: string;
  partnerName: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
        {label}
      </p>
      <dl className="space-y-4 text-sm">
        <Row
          term="Who has the ball"
          definition={whoLabel(
            response.who_has_ball,
            responderIsViewer,
            viewerName,
            partnerName,
          )}
        />
        <Row
          term="Why I feel that way"
          definition={displayPreset(response.why, response.why_custom, WHY_OPTIONS)}
        />
        <Row
          term="What I'm waiting for"
          definition={displayPreset(
            response.expectation,
            response.expectation_custom,
            EXPECTATION_OPTIONS,
          )}
        />
      </dl>
    </div>
  );
}

function Row({ term, definition }: { term: string; definition: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {term}
      </dt>
      <dd className="mt-1">{definition}</dd>
    </div>
  );
}

function SignalCallout({
  signal,
  partnerName,
}: {
  signal: Signal;
  partnerName: string;
}) {
  const config = SIGNAL_CONFIG[signal];
  return (
    <div
      className={`rounded-2xl border p-5 ${config.containerClass}`}
      role="status"
    >
      <p className="font-semibold">{config.headline}</p>
      <p className={`text-sm mt-1 ${config.descriptionClass}`}>
        {typeof config.description === "function"
          ? config.description(partnerName)
          : config.description}
      </p>
    </div>
  );
}

const SIGNAL_CONFIG: Record<
  Signal,
  {
    headline: string;
    description: string | ((partnerName: string) => string);
    containerClass: string;
    descriptionClass: string;
  }
> = {
  orange: {
    headline: "You both pointed to the same person.",
    description: (partnerName) =>
      `You and ${partnerName} agree on who's holding this ball. The next question is whether they want to be the one holding it — and what that means for both of you.`,
    containerClass:
      "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
    descriptionClass: "text-orange-900/80 dark:text-orange-100/80",
  },
  blue: {
    headline: "You see this differently.",
    description:
      "Your perspectives don't line up — that's worth slowing down for. Different views aren't a problem. They're the conversation.",
    containerClass:
      "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30",
    descriptionClass: "text-blue-900/80 dark:text-blue-100/80",
  },
  red: {
    headline: "The ball is getting dropped.",
    description:
      "Neither of you is fully owning this. That's where things slip through the cracks — usually not on purpose.",
    containerClass:
      "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
    descriptionClass: "text-red-900/80 dark:text-red-100/80",
  },
};

function computeSignal(viewerWho: WhoOption, partnerWho: WhoOption): Signal {
  // Both pointing to the same person:
  //   viewer "me" + partner "you" → both say the viewer has it
  //   viewer "you" + partner "me" → both say the partner has it
  const sameHolder =
    (viewerWho === "me" && partnerWho === "you") ||
    (viewerWho === "you" && partnerWho === "me");
  if (sameHolder) return "orange";

  const dropped = (a: WhoOption) => a === "both_dropped" || a === "not_sure";
  if (dropped(viewerWho) && dropped(partnerWho)) return "red";

  return "blue";
}

/**
 * Translate a "who has the ball" answer into a sentence appropriate to
 * the column's perspective. The viewer's column reads in first person;
 * the partner's column refers to them by name.
 */
function whoLabel(
  answer: WhoOption,
  responderIsViewer: boolean,
  _viewerName: string,
  partnerName: string,
): string {
  if (answer === "both_dropped") return "We've both dropped it";

  if (responderIsViewer) {
    if (answer === "me") return "I have the ball";
    if (answer === "you") return `${partnerName} has the ball`;
    if (answer === "not_sure") return "I'm not sure";
  } else {
    if (answer === "me") return `${partnerName} has the ball`;
    if (answer === "you") return "I have the ball";
    if (answer === "not_sure") return `${partnerName} is unsure`;
  }
  return answer;
}

function displayPreset(
  key: string,
  customText: string | null,
  options: readonly { key: string; label: string }[],
): string {
  if (key === CUSTOM_KEY && customText) return customText;
  return labelFor(options, key);
}
