import { CATEGORIES } from "@/lib/content";

const STEPS = [
  {
    title: "Pick the ball",
    body: "Choose one thing that's been coming up, about money, home, or how you relate.",
  },
  {
    title: "Take turns",
    body: "Each of you answers three short questions on your own while the other looks away.",
  },
  {
    title: "See it together",
    body: "Your answers sit side by side, showing where you see it the same way and what's worth talking about.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line px-5 py-5 sm:px-10 lg:px-14">
        <p className="font-display text-[22px] leading-[0.9] font-extrabold uppercase">
          Who&apos;s got
          <br />
          the ball
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-wrap items-start gap-10 px-5 py-8 sm:px-10 sm:py-12 lg:gap-14 lg:px-14 lg:py-14">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          <p className="font-mono text-xs tracking-[0.12em] text-muted">FOR TWO PEOPLE, ONE PHONE</p>
          <h1 className="font-display text-[clamp(52px,7vw,104px)] leading-[0.86] font-extrabold uppercase">
            Same ball.
            <br />
            Two views.
          </h1>
          <p className="max-w-[52ch] text-lg leading-relaxed text-muted">
            Pick one shared responsibility that&apos;s been on your mind. Each of you says who you think
            is holding it and why, then you look at both answers together and talk it through.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <h2 className="border-b border-ink pb-2.5 font-display text-xl font-extrabold uppercase">
              What you can talk about
            </h2>
            <ul>
              {CATEGORIES.map((category) => (
                <li
                  key={category.slug}
                  className="flex flex-col gap-1 border-b border-line py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="font-display text-[26px] leading-none font-bold uppercase">
                    {category.name}
                  </span>
                  <span className="text-[15px] text-muted sm:text-right">{category.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <ol className="flex flex-col rounded-md border border-line bg-surface">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 border-b border-line p-5 last:border-b-0">
                <span className="pt-1 font-mono text-xs tracking-[0.12em] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="font-display text-2xl leading-none font-bold uppercase">{step.title}</span>
                  <span className="text-[15px] leading-snug text-muted">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          {/* Wired up in the next build step (entering both names). */}
          <button
            type="button"
            disabled
            className="flex min-h-16 items-center justify-between rounded-md bg-accent px-5.5 font-display text-2xl font-extrabold text-on-accent uppercase disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start
            <span aria-hidden="true">→</span>
          </button>
          <p className="font-mono text-[11px] tracking-[0.12em] text-muted">
            NOTHING IS SAVED OR SHARED. IT ALL STAYS ON THIS PHONE.
          </p>
        </aside>
      </main>
    </div>
  );
}
