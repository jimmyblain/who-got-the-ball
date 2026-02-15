"use client";

/**
 * Onboarding Welcome Page
 *
 * This is the first thing new users see after signing up.
 * Instead of forcing them through all 15 questions, we just explain
 * how the app works and let them explore categories at their own pace
 * from the dashboard.
 *
 * Flow:
 * 1. User reads the welcome explanation
 * 2. Clicks "Get Started"
 * 3. We mark onboarding as complete in the database
 * 4. They land on the dashboard where they can tap into any category
 *
 * After onboarding, we also check localStorage for a pending partner
 * invite code (see Task 2) — if one exists, we redirect to that
 * invite page so the partner link completes automatically.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/actions/answers";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  // Track whether the "Get Started" button has been clicked (shows a spinner)
  const [loading, setLoading] = useState(false);

  /**
   * When the user clicks "Get Started":
   * 1. Mark onboarding complete in the database
   * 2. Check if there's a pending partner invite code in localStorage
   *    (this happens when someone opened an invite link before signing up)
   * 3. Redirect to the invite page or the dashboard
   */
  const handleGetStarted = async () => {
    setLoading(true);

    // Tell the server to mark onboarding as done for this user
    const result = await completeOnboarding();

    if (result?.error) {
      // If something went wrong, stop the spinner so they can try again
      setLoading(false);
      return;
    }

    // Check if there's a pending partner invite code saved from before signup
    // (see the invite page — it saves the code to localStorage for new users)
    const pendingInviteCode = localStorage.getItem("pending_invite_code");
    if (pendingInviteCode) {
      // Clean up the stored code so it doesn't trigger again
      localStorage.removeItem("pending_invite_code");
      // Send them to the invite acceptance page
      router.push(`/partner/invite/${pendingInviteCode}`);
    } else {
      // No pending invite — just go to the dashboard
      router.push("/dashboard");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Big welcome header */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🏀</div>
        <h1 className="text-3xl font-bold mb-3">
          Welcome to Who&apos;s Got The Ball?
        </h1>
        <p className="text-lg text-muted-foreground">
          A simple tool to help you and your partner figure out who owns what
          in your relationship.
        </p>
      </div>

      {/* Explanation cards */}
      <div className="space-y-4 mb-10">
        {/* Card 1: What is this app? */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-2">How does it work?</h2>
          <p className="text-muted-foreground">
            You&apos;ll explore topics like <strong>finances</strong>,{" "}
            <strong>household tasks</strong>, and{" "}
            <strong>emotional responsibilities</strong>. For each one,
            you&apos;ll answer questions about who &quot;holds the ball&quot;
            — meaning who takes the lead on that responsibility.
          </p>
        </div>

        {/* Card 2: The three answer types */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-3">Three ways to answer</h2>
          <div className="space-y-3">
            {/* "My ball" explanation */}
            <div className="flex items-start gap-3">
              <span className="text-2xl">🙋</span>
              <div>
                <p className="font-medium">My ball</p>
                <p className="text-sm text-muted-foreground">
                  This is your responsibility — you take the lead on it.
                </p>
              </div>
            </div>
            {/* "Partner's ball" explanation */}
            <div className="flex items-start gap-3">
              <span className="text-2xl">🙋‍♂️</span>
              <div>
                <p className="font-medium">Partner&apos;s ball</p>
                <p className="text-sm text-muted-foreground">
                  Your partner takes the lead on this one.
                </p>
              </div>
            </div>
            {/* "We share" explanation */}
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤝</span>
              <div>
                <p className="font-medium">We share this ball</p>
                <p className="text-sm text-muted-foreground">
                  You both share this responsibility equally.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: What happens next */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-2">Go at your own pace</h2>
          <p className="text-muted-foreground">
            There&apos;s no rush! You can explore each category whenever
            you&apos;re ready. Once your partner joins, you&apos;ll be
            able to compare answers and see where you agree — or where
            you might need to talk things through.
          </p>
        </div>
      </div>

      {/* Big "Get Started" button */}
      <div className="text-center">
        <Button
          onClick={handleGetStarted}
          disabled={loading}
          size="lg"
          className="min-w-[200px] bg-gradient-to-r from-purple-500 to-teal-400 hover:from-purple-600 hover:to-teal-500 text-white"
        >
          {loading ? "Setting things up..." : "Get Started →"}
        </Button>
      </div>
    </div>
  );
}
