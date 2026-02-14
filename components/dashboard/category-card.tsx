import Link from "next/link";
import type { CategoryWithStats } from "@/lib/types";
import {
  Wallet,
  Home,
  Heart,
  Briefcase,
  Baby,
  GraduationCap,
  Dumbbell,
  LucideIcon,
  CircleDot,
} from "lucide-react";

/**
 * CategoryCard — A big, colorful card for each category on the dashboard.
 * Shows the category name, icon, color, and a summary of how the balls are distributed.
 * Clicking it takes you into the category detail page.
 */

// Map icon names (stored in DB) to actual Lucide React icon components
const iconMap: Record<string, LucideIcon> = {
  wallet: Wallet,
  home: Home,
  heart: Heart,
  briefcase: Briefcase,
  baby: Baby,
  graduation: GraduationCap,
  dumbbell: Dumbbell,
};

type CategoryCardProps = {
  category: CategoryWithStats;
  hasPartner: boolean;
};

export function CategoryCard({ category, hasPartner }: CategoryCardProps) {
  // Get the icon component, or use a default circle if the icon name isn't recognized
  const IconComponent = iconMap[category.icon] || CircleDot;

  return (
    <Link href={`/dashboard/${category.slug}`}>
      <div
        className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm
                   hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
      >
        {/* Colored accent bar at the top */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
          style={{ backgroundColor: category.color }}
        />

        <div className="flex items-start justify-between">
          {/* Icon in a colored circle */}
          <div
            className="rounded-full p-3"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <IconComponent
              size={28}
              style={{ color: category.color }}
            />
          </div>

          {/* Conflict indicator */}
          {category.conflict_count > 0 && (
            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded-full animate-pulse-border">
              {category.conflict_count} conflict{category.conflict_count > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Category name */}
        <h3 className="text-xl font-bold mt-4 mb-3">{category.name}</h3>

        {/* Ball distribution summary */}
        <div className="flex flex-wrap gap-2">
          {category.mine_count > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              {category.mine_count} yours
            </span>
          )}
          {category.partner_count > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {category.partner_count} partner&apos;s
            </span>
          )}
          {category.shared_count > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              {category.shared_count} shared
            </span>
          )}
          {category.unanswered_count > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {category.unanswered_count} unanswered
            </span>
          )}
        </div>

        {/* Arrow indicator on hover */}
        <div className="absolute right-4 bottom-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          →
        </div>
      </div>
    </Link>
  );
}
