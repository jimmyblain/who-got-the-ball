"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/actions/profile";

type Props = {
  initialDisplayName: string;
  email: string;
};

export function ProfileForm({ initialDisplayName, email }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = displayName.trim() !== initialDisplayName.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !dirty) return;
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({ displayName });
      if (result?.error) setError(result.error);
      else setSavedAt(Date.now());
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="display-name">Your name</Label>
        <Input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setSavedAt(null);
          }}
          placeholder="What your partner sees"
        />
        <p className="text-xs text-muted-foreground">
          This is what your partner will see in sessions and on the reveal screen.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Email</Label>
        <Input value={email} disabled />
        <p className="text-xs text-muted-foreground">
          Email changes aren&apos;t supported yet.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          {error && <span className="text-destructive">{error}</span>}
          {savedAt && !error && (
            <span className="text-muted-foreground">Saved.</span>
          )}
        </div>
        <Button type="submit" disabled={!dirty || isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
