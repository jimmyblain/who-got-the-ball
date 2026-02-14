"use client";

/**
 * InviteLink — lets users copy their unique invite link to share with their partner.
 * When the partner visits this link, they'll be prompted to link accounts.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";

type InviteLinkProps = {
  inviteCode: string;
};

export function InviteLink({ inviteCode }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);

  // Build the full invite URL using the current domain
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/partner/invite/${inviteCode}`
      : `/partner/invite/${inviteCode}`;

  // Copy the link to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      // Reset the "Copied!" message after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Share this link with your partner so they can connect with you:
      </p>
      <div className="flex gap-2">
        <code className="flex-1 bg-secondary px-4 py-2 rounded-lg text-sm break-all">
          {inviteUrl}
        </code>
        <Button onClick={handleCopy} variant="outline">
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
