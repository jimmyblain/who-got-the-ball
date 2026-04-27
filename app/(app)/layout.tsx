import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

/**
 * Layout for all authenticated pages.
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

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="font-bold text-lg bg-gradient-to-r from-purple-500 to-teal-400 bg-clip-text text-transparent"
          >
            Who&apos;s Got The Ball?
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/dashboard"
              className="text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              Home
            </Link>

            <Link
              href="/partner"
              className="text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              Partner
            </Link>

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

      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6">
        {children}
      </div>
    </main>
  );
}
