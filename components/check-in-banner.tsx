"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { completeCheckIn, dismissCheckIn } from "@/actions/check-ins";

export type DueCheckIn = {
  id: string;
  sessionId: string;
  scenarioText: string;
};

type Props = {
  checkIns: DueCheckIn[];
};

/**
 * Renders due check-ins on the home page. Each row offers
 * Mark complete / Dismiss / View session.
 */
export function CheckInBanner({ checkIns }: Props) {
  if (checkIns.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Time to check in
      </h2>
      {checkIns.map((c) => (
        <CheckInRow key={c.id} item={c} />
      ))}
    </div>
  );
}

function CheckInRow({ item }: { item: DueCheckIn }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-5">
      <p className="text-xs uppercase tracking-wide text-amber-900/70 dark:text-amber-100/70 mb-1">
        Check in on
      </p>
      <p className="font-medium mb-4">{item.scenarioText}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await completeCheckIn(item.id);
            })
          }
        >
          Mark complete
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await dismissCheckIn(item.id);
            })
          }
        >
          Dismiss
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/session/${item.sessionId}/reveal`}>View session</Link>
        </Button>
      </div>
    </div>
  );
}
