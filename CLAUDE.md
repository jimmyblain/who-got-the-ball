# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

"Who's Got The Ball?" is a social-emotional wellness tool that helps couples get clear on shared responsibilities. It prompts discussion, not scorekeeping: avoid scores, tallies or competitive framing in copy and UI.

## Current state: one-phone MVP rebuild

The app is being rebuilt from scratch, feature by feature, as a **one-phone** experience: two partners take turns on the same device, each privately answers who holds the ball (Who / Why / Expectation), then both see their answers side by side and talk it through.

- No accounts, no database, no API routes. Session state lives in the browser (later also `localStorage` for resume).
- All quiz content (categories, scenarios, answer options) lives in `lib/content.ts`, shaped like the old `categories` / `scenarios` tables so it can move back into a database later.
- "Who" answers use the two partners' names (`player_a` / `player_b` keys), so answers compare directly.
- Build order and decisions: the "Who's Got The Ball: one-phone MVP" doc in the project. The first release ends at the reveal; the shift (action + phrase) comes right after.

The previous two-account app (Supabase auth, partner linking, sessions, check-ins) is preserved on the `archive/v1-two-account` branch. Don't reintroduce Supabase, auth or partner linking unless asked; when two-phone play returns it will be rebuilt on top of this MVP.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint check
```

No test framework is configured yet.

## Stack

Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript. Dependency versions are pinned exactly in `package.json`.

## Design

Visual direction is **Dusk**: deep plum background with a soft coral accent. Tokens are defined in `app/globals.css` under `@theme` (`bg`, `surface`, `line`, `ink`, `muted`, `accent`, `on-accent`, `common`), so use classes like `bg-surface`, `text-muted`, `border-line`, `bg-accent`.

- Type: Barlow Condensed for uppercase display headlines (`font-display`), Barlow for body (`font-sans`), IBM Plex Mono for small uppercase labels (`font-mono`). Loaded with `next/font` in `app/layout.tsx`.
- Every screen must work on a desktop browser and on a phone held upright.
- Hairline borders (`border-line`), 6px radius (`rounded-md`), no gradients or shadows.
- Per-screen layout, components and copy follow the Dusk design handoff ("Dusk design handoff (one-phone MVP)" in the project files, with a playable reference of every screen).

## Conventions

- Path alias: `@/*` maps to the project root.
- Use `await connection()` from `next/server` to mark pages dynamic (not `export const dynamic`).

## Deployment

Hosted on Vercel, connected to the GitHub repo, auto-deploys on push to `main`. Pull requests get preview deployments. The MVP needs no environment variables.
