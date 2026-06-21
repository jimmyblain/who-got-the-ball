"use client";

/**
 * Onboarding / "How it works" page.
 *
 * New users see this once after sign-up. The "How it works" link in the nav
 * routes here too, so the copy needs to read just as well on a return visit.
 *
 * Clicking "Get Started" marks onboarding complete (idempotent — safe to
 * click on revisits) and forwards to the dashboard, picking up any pending
 * partner invite code from localStorage along the way.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/actions/onboarding";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGetStarted = async () => {
    setLoading(true);
    const result = await completeOnboarding();
    if (result?.error) {
      setLoading(false);
      return;
    }

    const pendingInviteCode = localStorage.getItem("pending_invite_code");
    if (pendingInviteCode) {
      localStorage.removeItem("pending_invite_code");
      router.push(`/partner/invite/${pendingInviteCode}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🏀</div>
        <h1 className="text-3xl font-bold mb-3">
          Who&apos;s Got The Ball?
        </h1>
        <p className="text-lg text-muted-foreground">
          A guided way to talk through what&apos;s coming up between you and
          your partner.
        </p>
      </div>

      <div className="space-y-4 mb-10">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-2">How a session works</h2>
          <p className="text-muted-foreground leading-relaxed">
            You both pick a topic that&apos;s been coming up — money, household
            stuff, or how you talk to each other. Then each of you answers
            three questions, in private, about that one thing:
          </p>
          <ol className="list-decimal list-inside mt-3 space-y-1 text-muted-foreground">
            <li>Who&apos;s holding the ball?</li>
            <li>Why do you feel that way?</li>
            <li>What are you waiting for the other person to do?</li>
          </ol>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-3">Then you compare</h2>
          <p className="text-muted-foreground leading-relaxed">
            Once you&apos;ve both answered, you see a side-by-side reveal.
            It color-codes the result so you know whether you&apos;re aligned,
            disagreeing, or both quietly dropping the ball.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-3">Talk, commit, check back</h2>
          <p className="text-muted-foreground leading-relaxed">
            Take a minute to actually talk about it — there are healthy
            phrases on screen if you need a way in, and an optional
            two-minute timer. At the end, each of you picks one small action
            and one thing you want to say. You can schedule a reminder to
            check in a few days later.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-2">A note before you start</h2>
          <p className="text-muted-foreground leading-relaxed">
            Sessions are designed for two people. If you don&apos;t have your
            partner linked yet, you&apos;ll be prompted to invite them before
            starting your first session.
          </p>
        </div>
      </div>

      <div className="text-center">
        <Button
          onClick={handleGetStarted}
          disabled={loading}
          size="lg"
          className="min-w-[200px] bg-gradient-to-r from-purple-500 to-teal-400 hover:from-purple-600 hover:to-teal-500 text-white"
        >
          {loading ? "Setting things up..." : "Got it →"}
        </Button>
      </div>
    </div>
  );
}
