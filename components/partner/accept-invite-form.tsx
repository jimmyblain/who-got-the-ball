"use client";

/**
 * AcceptInviteForm — A manual fallback for entering a partner's invite code.
 *
 * This is shown on the Partner page when the user isn't partnered yet.
 * It gives them a text input where they can paste an invite code directly,
 * as an alternative to clicking the full invite URL.
 *
 * Why this exists:
 * - Sometimes the invite link doesn't work (e.g., copied wrong, expired session)
 * - The invite code is the last part of the URL, so it's easy to share as text
 * - This gives users a simple fallback to connect manually
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkPartner } from "@/actions/partner";
import { Button } from "@/components/ui/button";

export function AcceptInviteForm() {
  // The invite code the user types/pastes in
  const [inviteCode, setInviteCode] = useState("");
  // Whether we're currently linking (shows a spinner on the button)
  const [loading, setLoading] = useState(false);
  // Any error message from the server (e.g., "Invalid invite code")
  const [error, setError] = useState<string | null>(null);
  // Whether linking succeeded
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  /**
   * Handle form submission — extract the invite code (even if they pasted
   * a full URL) and call the server action to link accounts.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up the input — if they pasted a full URL like
    // "https://example.com/partner/invite/abc123", extract just "abc123"
    const trimmed = inviteCode.trim();
    // Try to pull the code from a URL, or use the raw input as-is
    const codeMatch = trimmed.match(/\/partner\/invite\/([^/?]+)/);
    const code = codeMatch ? codeMatch[1] : trimmed;

    if (!code) return; // Don't submit empty input

    setLoading(true);
    setError(null);

    const result = await linkPartner(code);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      // Refresh the page after a brief pause to show the partnered state
      setTimeout(() => router.refresh(), 1500);
    }
  };

  // Show success message after linking
  if (success) {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-2">🎉</div>
        <p className="font-semibold text-green-600 dark:text-green-400">
          Connected! Refreshing...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Text input for the invite code */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Paste invite code or link"
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm
                     placeholder:text-muted-foreground focus:outline-none focus:ring-2
                     focus:ring-purple-500/20 focus:border-purple-500"
        />
        <Button
          type="submit"
          disabled={loading || !inviteCode.trim()}
          size="sm"
        >
          {loading ? "Linking..." : "Connect"}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
          {error}
        </p>
      )}
    </form>
  );
}
