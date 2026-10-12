import type { ButtonHTMLAttributes, ReactNode } from "react";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Two columns that wrap: side by side on desktop, stacked on a phone. */
export function Screen({
  children,
  align = "start",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <main
      className={cx(
        "mx-auto flex w-full max-w-[1200px] flex-wrap gap-[clamp(28px,5vw,80px)] px-[clamp(20px,4vw,56px)] pt-[clamp(28px,5vw,72px)] pb-12",
        align === "end" ? "items-end" : "items-start",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function Column({ children, wide, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <section
      className={cx(
        "flex min-w-0 flex-col",
        wide ? "flex-[999_1_520px]" : "flex-[1_1_380px]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Kicker({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "common" }) {
  return (
    <span
      className={cx(
        "font-mono text-xs tracking-[0.12em] uppercase",
        tone === "common" ? "text-common" : "text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function Title({ children, size = "page" }: { children: ReactNode; size?: "page" | "hero" }) {
  return (
    <h1
      tabIndex={-1}
      data-screen-title
      className={cx(
        "m-0 font-display font-extrabold uppercase outline-none",
        size === "hero"
          ? "text-[clamp(64px,10vw,148px)] leading-[0.84]"
          : "text-[clamp(52px,7vw,104px)] leading-[0.86]",
      )}
    >
      {children}
    </h1>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "flex min-h-[60px] cursor-pointer items-center justify-between gap-7 rounded-md bg-accent px-5.5 text-left font-display text-2xl leading-none font-extrabold text-on-accent uppercase disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "min-h-12 cursor-pointer rounded-md border-[1.5px] border-line bg-transparent px-4.5 font-mono text-xs tracking-[0.1em] text-ink uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** The selection ring: an outline when off, a coral dot when on. */
function Ring({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "size-[18px] shrink-0 rounded-full",
        on ? "border-[6px] border-accent" : "border-[1.5px] border-current",
      )}
    />
  );
}

/** A full-width choice row. Use inside an element with role="radiogroup". */
export function OptionRow({
  label,
  checked,
  onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cx(
        "flex min-h-[60px] cursor-pointer items-center gap-3.5 rounded-md border-[1.5px] px-4.5 py-2.5 text-left text-[17px] font-medium",
        checked ? "border-ink bg-ink text-on-accent" : "border-line bg-transparent text-ink",
      )}
    >
      <Ring on={checked} />
      {label}
    </button>
  );
}

/** A lighter list-style choice row, used for scenarios. */
export function ListOption({
  label,
  checked,
  onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className="flex min-h-14 cursor-pointer items-center gap-3.5 border-b border-line bg-transparent px-1 py-2 text-left text-[17px] text-ink"
    >
      <Ring on={checked} />
      {label}
    </button>
  );
}

export function Tag({ kind }: { kind: "common" | "talk" }) {
  return (
    <span
      className={cx(
        "rounded-[3px] border px-[7px] py-1 font-mono text-[10px] leading-[1.3] tracking-[0.06em] uppercase",
        kind === "common" ? "border-common bg-common text-on-accent" : "border-ink bg-transparent text-ink",
      )}
    >
      {kind === "common" ? "Common ground" : "Worth talking about"}
    </span>
  );
}
