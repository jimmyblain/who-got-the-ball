"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { scheduleCheckIn } from "@/actions/check-ins";

const OPTIONS = [
  { days: 3, label: "In 3 days" },
  { days: 7, label: "Next week" },
  { days: 14, label: "In 2 weeks" },
];

type Props = {
  sessionId: string;
};

/**
 * Pick a check-in window after the session ends. Skipping doesn't write
 * anything — the user just leaves.
 */
export function CheckInScheduler({ sessionId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pickedDays, setPickedDays] = useState<number | null>(null);

  const schedule = (days: number) => {
    if (isPending) return;
    setPickedDays(days);
    setError(null);
    startTransition(async () => {
      const result = await scheduleCheckIn(sessionId, days);
      if (result?.error) {
        setError(result.error);
        setPickedDays(null);
      } else {
        router.push(`/session/${sessionId}/done`);
      }
    });
  };

  const skip = () => {
    if (isPending) return;
    router.push(`/session/${sessionId}/done`);
  };

  return (
    <div className="space-y-3">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.days}
          variant={pickedDays === opt.days ? "default" : "outline"}
          size="lg"
          className="w-full justify-start"
          disabled={isPending}
          onClick={() => schedule(opt.days)}
        >
          {opt.label}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="lg"
        className="w-full justify-start text-muted-foreground"
        disabled={isPending}
        onClick={skip}
      >
        Skip for now
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
