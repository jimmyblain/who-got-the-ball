"use client";

/**
 * TransferCard — shows a pending "pass the ball" request.
 * If you're the receiver, you can accept or decline.
 * If you're the sender, you see the status.
 */

import { useState } from "react";
import { acceptTransfer, declineTransfer } from "@/actions/transfers";
import { Button } from "@/components/ui/button";

type TransferCardProps = {
  transferId: string;
  questionText: string;
  fromName: string;
  toName: string;
  message: string | null;
  status: string;
  isReceiver: boolean;  // true if the current user is the one receiving the request
  categoryColor: string;
  createdAt: string;
};

export function TransferCard({
  transferId,
  questionText,
  fromName,
  toName,
  message,
  status,
  isReceiver,
  categoryColor,
  createdAt,
}: TransferCardProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    await acceptTransfer(transferId);
    setLoading(false);
  };

  const handleDecline = async () => {
    setLoading(true);
    await declineTransfer(transferId);
    setLoading(false);
  };

  // Status badge colors
  const statusStyles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    declined: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      {/* Header with status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium">{questionText}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isReceiver
              ? `${fromName} wants to pass this ball to you`
              : `You asked ${toName} to take this ball`}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[status] || ""}`}
        >
          {status}
        </span>
      </div>

      {/* Optional message */}
      {message && (
        <div className="bg-secondary rounded-lg p-3 mb-3">
          <p className="text-sm italic">&quot;{message}&quot;</p>
        </div>
      )}

      {/* Date */}
      <p className="text-xs text-muted-foreground mb-3">
        {new Date(createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {/* Accept/Decline buttons (only for receiver + pending status) */}
      {isReceiver && status === "pending" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={loading}
            style={{ backgroundColor: categoryColor }}
          >
            {loading ? "..." : "Accept ball"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            disabled={loading}
          >
            {loading ? "..." : "Decline"}
          </Button>
        </div>
      )}
    </div>
  );
}
