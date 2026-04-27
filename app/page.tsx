import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

/**
 * Landing Page — the first thing visitors see.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="w-full border-b">
        <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <span className="font-bold text-lg bg-gradient-to-r from-purple-500 to-teal-400 bg-clip-text text-transparent">
            Who&apos;s Got The Ball?
          </span>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-2xl text-center space-y-6">
          <div className="flex justify-center gap-4 text-5xl">
            <span className="animate-bob" style={{ animationDelay: "0s" }}>
              🟡
            </span>
            <span className="animate-bob" style={{ animationDelay: "0.3s" }}>
              🟢
            </span>
            <span className="animate-bob" style={{ animationDelay: "0.6s" }}>
              🟣
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Ever feel like you have{" "}
            <span className="bg-gradient-to-r from-amber-500 via-teal-500 to-purple-500 bg-clip-text text-transparent">
              all the responsibility
            </span>
            ,<br className="hidden sm:block" /> while the other person thinks they do too?
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            This exercise helps you and your partner figure out who&apos;s actually
            holding the ball — and how to talk about it.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg" className="text-base">
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link href="/auth/login">I have an account</Link>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl"
              style={{ backgroundColor: "#F59E0B20" }}
            >
              💬
            </div>
            <h3 className="font-semibold">Name what&apos;s coming up</h3>
            <p className="text-sm text-muted-foreground">
              Pick from common patterns — arguing about the same thing,
              feeling like you&apos;re carrying more — or describe your own.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl"
              style={{ backgroundColor: "#14B8A620" }}
            >
              👀
            </div>
            <h3 className="font-semibold">See it side by side</h3>
            <p className="text-sm text-muted-foreground">
              Each of you answers in private. Then you compare and see
              where you actually agree, disagree, or are dropping the ball.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl"
              style={{ backgroundColor: "#A78BFA20" }}
            >
              🚀
            </div>
            <h3 className="font-semibold">Walk away with one step</h3>
            <p className="text-sm text-muted-foreground">
              Pick a small action and a way to bring it up — then check
              back in a few days to see how it&apos;s going.
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Who&apos;s Got The Ball? — Conversations that matter.</p>
      </footer>
    </main>
  );
}
