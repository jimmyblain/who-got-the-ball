"use client";

/**
 * UnlinkPartnerButton — lets users disconnect from their partner.
 * Shows a confirmation step to prevent accidental unlinking.
 */

import { useState } from "react";
import { unlinkPartner } from "@/actions/partner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function UnlinkPartnerButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUnlink = async () => {
    setLoading(true);
    const result = await unlinkPartner();
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleUnlink}
          disabled={loading}
        >
          {loading ? "Unlinking..." : "Yes, unlink"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setConfirming(true)}
    >
      Unlink partner
    </Button>
  );
}
