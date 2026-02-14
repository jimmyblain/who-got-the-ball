import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

/**
 * Layout for all authenticated pages.
 * This wraps every page inside the (app) folder with a navigation bar.
 * Think of it like a picture frame — the nav stays the same, only the "picture" (page content) changes.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If somehow not logged in, redirect to login
  if (!user) redirect("/auth/login");

  // Get user profile for display name and pending transfer count
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, partner_id")
    .eq("id", user.id)
    .single();

  // Count pending transfers (for notification badge)
  const { count: pendingTransfers } = await supabase
    .from("transfers")
    .select("*", { count: "exact", head: true })
    .eq("to_user_id", user.id)
    .eq("status", "pending");

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top navigation bar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          {/* App name / logo */}
          <Link
            href="/dashboard"
            className="font-bold text-lg bg-gradient-to-r from-purple-500 to-teal-400 bg-clip-text text-transparent"
          >
            Who&apos;s Got The Ball?
          </Link>

          {/* Navigation links */}
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/dashboard"
              className="text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              Dashboard
            </Link>

            <Link
              href="/partner"
              className="text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              Partner
            </Link>

            {/* Only show these if user has a partner */}
            {profile?.partner_id && (
              <>
                <Link
                  href="/conflicts"
                  className="text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors"
                >
                  Conflicts
                </Link>

                <Link
                  href="/transfers"
                  className="relative text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors"
                >
                  Transfers
                  {/* Red notification badge if there are pending transfers */}
                  {(pendingTransfers ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {pendingTransfers}
                    </span>
                  )}
                </Link>
              </>
            )}

            <ThemeSwitcher />

            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {profile?.display_name || user.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6">
        {children}
      </div>
    </main>
  );
}
