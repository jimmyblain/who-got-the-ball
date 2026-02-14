"use client";

/**
 * Invite Accept Page — shown when someone opens a partner invite link.
 * The [code] in the URL is the partner's unique invite code.
 * If the user is logged in, they can click to link accounts.
 * If not logged in, they'll be redirected to login first (by middleware).
 */

import { useState, use } from "react";
import { useRouter } from "next/navigation";
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

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    const result = await linkPartner(code);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      // Wait a moment then redirect to dashboard
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

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
