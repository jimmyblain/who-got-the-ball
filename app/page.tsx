const STEPS = [
  "Choose a topic together",
  "Take turns answering, privately",
  "See your answers side by side and talk",
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line px-[clamp(20px,4vw,56px)] py-4">
        <span className="font-display text-[22px] leading-[0.9] font-extrabold uppercase">
          Who&apos;s got
          <br />
          the ball
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-wrap items-end gap-[clamp(36px,6vw,96px)] px-[clamp(20px,4vw,56px)] pt-[clamp(36px,7vw,104px)] pb-12">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <h1 className="font-display text-[clamp(64px,9vw,136px)] leading-[0.84] font-extrabold uppercase">
            Who&apos;s got
            <br />
            the <span className="text-accent">ball?</span>
          </h1>
          <p className="max-w-[42ch] text-[19px] leading-normal text-muted">
            A ten-minute conversation for two, on one phone. Pick something that&apos;s been piling up,
            answer on your own, then look at it together.
          </p>
        </section>

        <section className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <ol className="border-t border-line">
            {STEPS.map((step, i) => (
              <li key={step} className="grid grid-cols-[40px_minmax(0,1fr)] border-b border-line py-3 text-base">
                <span className="pt-[3px] font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
          {/* Wired up in the next build step (entering both names). */}
          <button
            type="button"
            disabled
            className="flex min-h-16 items-center justify-between rounded-md bg-accent px-5.5 font-display text-[26px] font-extrabold text-on-accent uppercase disabled:cursor-not-allowed disabled:opacity-45"
          >
            Let&apos;s start
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    </div>
  );
}
