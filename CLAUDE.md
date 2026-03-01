# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

"Who's Got The Ball?" helps couples navigate shared responsibilities. Users answer questions across categories (Finances, Household Logistics, Emotional) about who "holds the ball" — i.e., who owns each responsibility. Answers are: "my ball", "my partner's ball", or "we share this ball". Partners can link accounts to surface conflicting answers as discussion items, and can "pass the ball" (transfer a responsibility) to each other with mutual consent.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint check
```

No test framework is configured yet.

## Architecture

**Stack:** Next.js 16 (App Router) + Supabase (auth + PostgreSQL) + Tailwind CSS + shadcn/ui

**Data-driven design:** Categories and questions live in the database, not in code. The UI dynamically renders whatever rows exist. Adding a new category or question = inserting a DB row.

### Request flow

1. `proxy.ts` intercepts every request — validates auth session, redirects unauthenticated users to `/auth/login`, redirects users who haven't completed onboarding to `/onboarding`
2. Server Components in `app/(app)/` fetch data securely via Supabase server client
3. Client Components (`"use client"`) handle interactivity (buttons, forms)
4. Client components call Server Actions in `actions/` for mutations — no API routes needed

### Key directories

- `app/(app)/` — Route group for all authenticated pages; shares a nav layout (`layout.tsx`) with transfer badge
- `actions/` — Server Actions: `answers.ts`, `partner.ts`, `transfers.ts`
- `components/` — Client components organized by feature (`onboarding/`, `dashboard/`, `partner/`, `transfers/`)
- `components/ui/` — shadcn/ui primitives (do not edit manually)
- `lib/supabase/server.ts` and `lib/supabase/client.ts` — Supabase client factories (server vs browser)
- `supabase/schema.sql` — Full database DDL with RLS policies and seed data

### Database

Five tables: `profiles`, `categories`, `questions`, `answers` (composite PK: `user_id + question_id`), `transfers`. All have Row Level Security enabled. A trigger (`handle_new_user`) auto-creates profiles on signup.

**RLS recursion gotcha:** Policies that subquery other RLS-protected tables cause 500 errors. Use `SECURITY DEFINER` functions (e.g., `get_my_partner_id()`) to break circular references.

### Next.js 16 specifics

- Uses `proxy.ts` instead of `middleware.ts` for request interception
- Use `await connection()` from `next/server` to mark pages as dynamic (not `export const dynamic`)
- `cacheComponents: true` in next.config.ts is incompatible with `export const dynamic` — keep it disabled

## Environment variables

Two required (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

**Locally:** Set in `.env.local` (git-ignored).

**Vercel:** Must be added manually in the Vercel dashboard under Project → Settings → Environment Variables. Vercel does NOT read `.env.local`. After adding or changing env vars, you must **redeploy** for changes to take effect.

## Conventions

- Server Actions use `"use server"` directive and are the only mutation path
- Answers use `upsert` (insert-or-update) pattern to avoid race conditions
- Partner linking is two-way: both profiles get `partner_id` set
- Accepting a transfer auto-updates both users' answers
- Path alias: `@/*` maps to project root

## Deployment

**Hosted on Vercel** — connected to the GitHub repo, auto-deploys on push to `main`.

- Vercel env vars must match your Supabase project settings (see Environment variables above)
- When copy-pasting API keys into Vercel, double-check that the full key was captured — keys easily get clipped by a character
- See `DEPLOYMENT.md` for a full checklist of tasks to complete before and during deployment
