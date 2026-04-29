"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const TWO_MINUTES = 120;

/**
 * Optional 2-minute countdown for the Discussion step. Idle, running, and
 * finished states. The "We talked" CTA on the page is independent of this —
 * users can keep talking past the timer or skip it entirely.
 */
export function DiscussionTimer() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  if (secondsLeft === null) {
    return (
      <Button variant="outline" onClick={() => setSecondsLeft(TWO_MINUTES)}>
        Start a 2-minute timer
      </Button>
    );
  }

  if (secondsLeft <= 0) {
    return (
      <div className="space-y-3">
        <p className="text-2xl font-mono font-bold tabular-nums">0:00</p>
        <p className="text-sm text-muted-foreground">
          Time&apos;s up. Keep going if you need to.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSecondsLeft(TWO_MINUTES)}
        >
          Start again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-3xl font-mono font-bold tabular-nums">
        {formatTime(secondsLeft)}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSecondsLeft(null)}
      >
        Cancel
      </Button>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
