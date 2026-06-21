# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

"Who's Got The Ball?" helps couples navigate shared responsibilities. Partners link accounts, then run guided **sessions**: they pick a top-of-mind scenario and a focal category (Finances, Household Logistics, Emotional), each privately answers who holds the ball (Who / Why / Expectation), then see a color-coded **reveal** comparing their answers, discuss, and commit to a **shift** (an action + a phrase). A session can schedule follow-up **check-ins**.

> Earlier versions used a per-question `answers` + `transfers` ("pass the ball") model. That has been **replaced** by the session model — don't reintroduce those tables/flows unless explicitly asked.

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
- `actions/` — Server Actions: `sessions.ts`, `check-ins.ts`, `partner.ts`, `onboarding.ts`, `profile.ts`
- `components/` — Client components organized by feature (`session/`, `home/`, `settings/`, `partner/`); shared session option lists + helpers live in `lib/session-options.ts`, session data helpers in `lib/sessions.ts`
- `components/ui/` — shadcn/ui primitives (do not edit manually)
- `lib/supabase/server.ts` and `lib/supabase/client.ts` — Supabase client factories (server vs browser)
- `supabase/schema.sql` — Full database DDL with RLS policies and seed data

### Database

Seven tables: `profiles`, `categories`, `scenarios`, `sessions`, `session_responses` (PK `session_id + user_id`), `session_actions` (PK `session_id + user_id`), `check_ins`. All have Row Level Security enabled. A trigger (`handle_new_user`) auto-creates profiles on signup.

**RLS recursion gotcha:** Policies that subquery other RLS-protected tables cause 500 errors. Use `SECURITY DEFINER` functions (e.g., `get_my_partner_id()`, `is_session_member()`) to break circular references.

**Security & data-integrity invariants (do not weaken without a strong, explicit reason):**

- Session-scoped tables (`session_responses`, `session_actions`, `check_ins`) must gate **writes** on `is_session_member(session_id)`, **not** just `auth.uid() = user_id`. The `user_id` check only proves attribution, not membership — relying on it alone let any authenticated user write into another couple's session.
- `profiles` is **not** world-readable: there is intentionally no blanket "look up by invite code" SELECT policy. Partner linking goes through the `link_partners()` `SECURITY DEFINER` RPC, so clients never need direct reads of other profiles. Don't add a broad profiles SELECT policy.
- Every `SECURITY DEFINER` function sets `search_path = ''` and schema-qualifies object refs.
- Session completion (status → `completed` once both partners commit) is handled by the `complete_session_when_both_committed()` trigger on `session_actions`, which row-locks the session. **Don't move this into a Server Action** — a count-then-update there races when both partners submit at once.
- One pending check-in per `(session_id, user_id)` is enforced by the partial unique index `check_ins_one_pending_per_user`.

**Applying schema changes:** editing `schema.sql` does NOT change the live database. Apply changes as an idempotent `supabase/fix-*.sql` script run in the Supabase **SQL Editor** (the Supabase MCP OAuth flow is currently broken). `schema.sql` is the canonical final state for fresh installs; keep it and the `fix-*.sql` migrations in sync.

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
- Session responses/actions use `upsert` with `onConflict: "session_id,user_id"` to avoid race conditions
- Session write actions (`submitResponse`, `submitAction`, `scheduleCheckIn`) call `getSessionAccess()` (`lib/sessions.ts`) to enforce membership + `in_progress` status before writing — defense-in-depth on top of RLS
- Validate answer keys (who/why/expectation/action/language) against the preset lists in `lib/session-options.ts` before writing — those columns have no DB CHECK constraint
- `DATE` columns (e.g. `check_ins.scheduled_for`) must be parsed as local midnight for display; `new Date("YYYY-MM-DD")` parses as UTC and renders the previous day for users behind UTC
- Partner linking is two-way: both profiles get `partner_id` set
- Path alias: `@/*` maps to project root

## Deployment

**Hosted on Vercel** — connected to the GitHub repo, auto-deploys on push to `main`.

- Vercel env vars must match your Supabase project settings (see Environment variables above)
- When copy-pasting API keys into Vercel, double-check that the full key was captured — keys easily get clipped by a character
- See `DEPLOYMENT.md` for a full checklist of tasks to complete before and during deployment
