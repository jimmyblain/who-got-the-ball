"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  initialSelectedIds?: string[];
  onContinue: (selectedIds: string[]) => void;
};

/**
 * Category multi-select. The user picks one or more categories where the
 * issue is showing up. The first selected (in display order) becomes the
 * focal category that the session drills into.
 */
export function CategoryMultiSelect({
  categories,
  initialSelectedIds = [],
  onContinue,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const orderedSelected = categories
    .filter((c) => selected.has(c.id))
    .map((c) => c.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Where is this showing up the most?</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick one or more. We&apos;ll focus on the first one you select.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {categories.map((cat) => {
          const isSelected = selected.has(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              className={`text-left rounded-xl border p-5 transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "bg-card hover:bg-secondary/40"
              }`}
              style={
                isSelected
                  ? { borderColor: cat.color, boxShadow: `0 0 0 2px ${cat.color}33` }
                  : undefined
              }
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-3"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                {cat.slug === "finances" && "💰"}
                {cat.slug === "household" && "🏠"}
                {cat.slug === "emotional" && "💬"}
              </div>
              <div className="font-semibold">{cat.name}</div>
              {cat.description && (
                <div className="text-sm text-muted-foreground mt-1">
                  {cat.description}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => onContinue(orderedSelected)}
          disabled={orderedSelected.length === 0}
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
