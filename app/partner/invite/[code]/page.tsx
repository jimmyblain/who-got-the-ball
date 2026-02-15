"use client";

/**
 * Invite Accept Page — shown when someone opens a partner invite link.
 *
 * IMPORTANT: This page lives OUTSIDE the (app) route group on purpose!
 * The (app) layout requires authentication and redirects to login if not
 * logged in. But we want unauthenticated users to see this page so they
 * can sign up. By placing it here (app/partner/invite/[code]/), it uses
 * the root layout instead of the auth-guarding (app) layout.
 *
 * The [code] in the URL is the partner's unique invite code.
 * This page handles two scenarios:
 *
 * 1. User is LOGGED IN → Show the "Accept & connect" / "No thanks" buttons.
 *    Clicking accept calls the linkPartner server action to connect accounts.
 *
 * 2. User is NOT LOGGED IN → Save the invite code to localStorage so it
 *    survives the signup/onboarding flow. Show a message telling them to
 *    sign up first. After they complete onboarding, the onboarding page
 *    checks localStorage and redirects them back here automatically.
 */

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { linkPartner } from "@/actions/partner";
import { Button } from "@/components/ui/button";

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // null = still checking, true = logged in, false = not logged in
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  /**
   * On mount, check if the user is logged in using the Supabase browser client.
   * This determines which UI we show (accept buttons vs "sign up first" message).
   */
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  /**
   * Handle clicking "Accept & connect" — calls the server action to link
   * the two partner accounts together.
   */
  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    const result = await linkPartner(code);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      // Wait a moment so the user sees the success message, then redirect
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  /**
   * Handle "Sign up first" — save the invite code to localStorage so
   * it persists through signup → onboarding → dashboard.
   * Then redirect to the sign-up page.
   */
  const handleSignUp = () => {
    // Save the invite code so we can pick it up after onboarding completes
    localStorage.setItem("pending_invite_code", code);
    router.push("/auth/sign-up");
  };

  /**
   * Handle "Log in" — same as sign up, but for existing users who
   * aren't currently logged in.
   */
  const handleLogin = () => {
    localStorage.setItem("pending_invite_code", code);
    router.push("/auth/login");
  };

  // Still checking authentication status — show a loading state
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-bob">🏀</div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Successfully linked! Show celebration before redirect
  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">You&apos;re connected!</h1>
        <p className="text-muted-foreground">
          Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  // NOT LOGGED IN — tell them to sign up/login, save code to localStorage
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="rounded-2xl border bg-card p-8 space-y-6">
          <div className="text-5xl">🤝</div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Partner invitation</h1>
            <p className="text-muted-foreground">
              Someone wants to connect with you on Who&apos;s Got The Ball?
              You need an account first — don&apos;t worry, the invite will
              be saved and you&apos;ll be connected automatically after
              signing up!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Primary action: sign up */}
            <Button onClick={handleSignUp} size="lg">
              Sign up to accept
            </Button>
            {/* Secondary: already have an account */}
            <Button variant="outline" onClick={handleLogin}>
              I already have an account — Log in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN — show the normal accept/decline UI
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="rounded-2xl border bg-card p-8 space-y-6">
        <div className="text-5xl">🤝</div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Partner invitation</h1>
          <p className="text-muted-foreground">
            Someone wants to connect with you on Who&apos;s Got The Ball? so you
            can compare your answers about shared responsibilities.
          </p>
        </div>

        {/* Show any errors (e.g., "already partnered") */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={handleAccept} disabled={loading} size="lg">
            {loading ? "Connecting..." : "Accept & connect"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
          >
            No thanks
          </Button>
        </div>
      </div>
    </div>
  );
}
