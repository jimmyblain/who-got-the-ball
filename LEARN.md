# LEARN.md — Who's Got The Ball?

## What Is This App?

"Who's Got The Ball?" is a web app that helps couples have productive conversations about shared responsibilities. Each responsibility is a "ball" — you answer questions about who owns it, partner up to compare answers, spot conflicts (where you both think it's yours), and request to transfer responsibilities.

Think of it like a relationship audit tool, but playful instead of clinical.

---

## The Technical Architecture (In Plain Language)

### The Stack

| Technology | What It Does | Why We Picked It |
|---|---|---|
| **Next.js 16** (App Router) | The framework that powers our web app — handles routing, server-side rendering, and API logic | It's the most popular React framework, and the App Router lets us mix server and client code seamlessly |
| **Supabase** | Our database + authentication system (think "Firebase but with SQL") | Free tier, built-in auth, real-time capabilities, and PostgreSQL under the hood |
| **Tailwind CSS** | Utility-first CSS framework for styling | Fast to build with, consistent design, great for responsive layouts |
| **TypeScript** | JavaScript with type checking | Catches bugs before they happen — like having a spell-checker for code |

### How The Pieces Connect

Imagine a restaurant:
- **Next.js** is the waiter — takes orders from users (browser requests) and brings back food (rendered pages)
- **Supabase** is the kitchen — stores all the ingredients (data) and has security guards (RLS policies) checking who's allowed to access what
- **Tailwind CSS** is the plating — makes everything look pretty
- **The proxy** (`proxy.ts`) is the bouncer at the door — checks if you're on the guest list before letting you in

### File Structure Explained

```
app/                          ← All the pages users see
  page.tsx                    ← Landing page (the homepage)
  (app)/                      ← Group folder for authenticated pages
    layout.tsx                ← The navigation bar (shared across all logged-in pages)
    onboarding/page.tsx       ← Where new users answer their first questions
    dashboard/page.tsx        ← Category cards overview
    dashboard/[slug]/page.tsx ← Drill into a single category's questions
    partner/page.tsx          ← Manage partner connection
    partner/invite/[code]/    ← Accept a partner invite
    conflicts/page.tsx        ← See where you and your partner disagree
    transfers/page.tsx        ← "Pass the ball" requests
  auth/                       ← Login, signup, password reset pages

components/                   ← Reusable UI pieces
  onboarding/question-card    ← Question with 3 answer buttons
  dashboard/category-card     ← Big colorful card per category
  dashboard/ball-card         ← Individual question/responsibility card
  partner/invite-link         ← Copyable invite URL
  transfers/transfer-card     ← Transfer request card

actions/                      ← Server Actions (secure server-side functions)
  answers.ts                  ← Save/update answers
  partner.ts                  ← Link/unlink partners
  transfers.ts                ← Request/accept/decline transfers

lib/                          ← Shared utilities
  types.ts                    ← TypeScript type definitions
  supabase/client.ts          ← Browser-side Supabase client
  supabase/server.ts          ← Server-side Supabase client

proxy.ts                      ← Auth guard (runs on every request)
supabase/schema.sql           ← Database table definitions
```

### The Data Model

The database has 5 main tables:

1. **profiles** — extends the auth user with display name, invite code, and partner link
2. **categories** — Finances, Household, Emotional (fully data-driven — add more without code changes!)
3. **questions** — 5 per category, linked via `category_id`
4. **answers** — each user's answer to each question (mine/partner/shared)
5. **transfers** — "pass the ball" requests between partners

The key insight: **categories and questions are stored in the database, not hardcoded**. Adding a new category (like "Parenting") is just inserting a row — the app picks it up automatically.

---

## Key Technical Decisions & Why

### 1. Server Components vs Client Components

Next.js lets you choose where code runs:
- **Server Components** (default) run on the server — great for fetching data securely
- **Client Components** (`"use client"`) run in the browser — needed for interactivity (clicks, forms)

We use Server Components for pages that display data (dashboard, conflicts), and Client Components for interactive parts (answer buttons, transfer forms).

### 2. Server Actions for Mutations

Instead of building API routes, we use **Server Actions** — functions marked with `"use server"` that run on the server but can be called from client components like regular functions. This is simpler and more secure than building separate API endpoints.

### 3. Row Level Security (RLS)

Supabase's RLS means the **database itself** enforces who can see what data. Even if someone hacked the frontend code, the database would still block unauthorized access. Each policy is like a rule: "User X can only read rows where user_id = their own ID."

### 4. Data-Driven Categories

Instead of hardcoding "Finances, Household, Emotional" in the code, we store them in a database table. The UI just loops over whatever's in the table. This means adding a new category later is a database insert, not a code change.

### 5. Proxy Instead of Middleware

Next.js 16 introduced `proxy.ts` as a replacement for `middleware.ts`. It serves the same purpose — runs before every request to check authentication — but with better integration with the new caching system.

---

## Bugs We Ran Into & How We Fixed Them

### Bug 1: Infinite Recursion in RLS Policies (500 Error)

**The symptom:** Fetching answers returned a 500 server error from Supabase.

**What happened:** We had RLS policies where the `answers` table had a policy that subqueried the `profiles` table, and the `profiles` table had a policy that subqueried... the `profiles` table. Supabase tried to evaluate policy → subquery → policy → subquery → infinity → crash.

**The fix:** We created a `SECURITY DEFINER` function (`get_my_partner_id()`) that bypasses RLS to safely look up the partner ID. This breaks the recursive loop because the function runs with elevated privileges and doesn't trigger RLS checks.

**Lesson:** When RLS policies reference other RLS-protected tables, use `SECURITY DEFINER` functions to break circular dependencies. This is a common Supabase gotcha!

### Bug 2: Profile Not Auto-Created

**The symptom:** Sign-up worked but the profile was missing, causing answers to fail (foreign key constraint).

**What happened:** We created the user account *before* setting up the database trigger that auto-creates profiles. The trigger only fires for *new* signups after it's installed.

**The fix:** Manually inserted profiles for existing users with a one-time SQL query.

**Lesson:** Always set up database triggers BEFORE creating test accounts!

### Bug 3: Onboarding "Next" Button Stayed Disabled

**The symptom:** After answering all 5 questions, the "Next" button was still grayed out.

**What happened:** Each `QuestionCard` component tracked its own answer state, but the parent `OnboardingPage` had no way of knowing when answers changed. The parent's `allAnswered` check only looked at the initial data load.

**The fix:** Added an `onAnswer` callback prop so QuestionCards notify the parent when an answer is saved. The parent updates its local state, and the "Next" button enables correctly.

**Lesson:** When child components have state that affects the parent's UI, you need to "lift state up" or use callbacks. React components are like isolated rooms — they can't see each other's state without explicitly connecting them.

### Bug 4: Next.js 16 `cacheComponents` Incompatibility

**The symptom:** Build failed with "Route segment config 'dynamic' is not compatible with cacheComponents."

**What happened:** The Next.js 16 template enabled `cacheComponents: true`, which is incompatible with `export const dynamic = "force-dynamic"`. These are two different approaches to the same problem (controlling when pages re-render).

**The fix:** Disabled `cacheComponents` in `next.config.ts` and used `await connection()` from `next/server` to mark pages as dynamic.

**Lesson:** Bleeding-edge framework features can conflict with established patterns. When in doubt, use the simpler approach.

---

## How Good Engineers Think

### 1. Data-Driven Over Hardcoded
Instead of writing `if (category === "finances")` everywhere, we store categories in the database and the UI dynamically renders whatever exists. This is called being **data-driven** — it means the code doesn't know or care about specific categories. Adding "Parenting" or "Social Life" later is just a database insert.

### 2. Security at the Database Level
RLS policies mean even if there's a bug in the frontend, the database won't leak data. This is called **defense in depth** — multiple layers of security so one failure doesn't compromise everything.

### 3. Upsert Over Insert + Update
For answers, we use `upsert` (insert-or-update) instead of checking "does this exist? if yes, update; if no, insert." This eliminates an entire class of race condition bugs and is simpler code.

### 4. Fail Fast, Fix Forward
When we hit the RLS recursion bug, we didn't try to patch around it — we identified the root cause (circular policy references) and fixed it properly with a `SECURITY DEFINER` function. Quick hacks accumulate into unmaintainable code.

---

## Potential Pitfalls & How to Avoid Them

1. **Supabase free tier pauses after 1 week of inactivity.** Visit the dashboard occasionally or set up a cron ping.

2. **Never commit `.env.local` to git.** It contains your secret keys. The `.gitignore` already excludes it.

3. **Always call `getUser()` in the proxy.** Without it, auth sessions silently break and users get randomly logged out.

4. **Test with two accounts.** Partner features, conflicts, and transfers all require two linked accounts to test properly.

5. **Cancel pending transfers when answers change.** If someone manually changes their answer to a question that has a pending transfer, the transfer should be auto-cancelled to avoid confusion.

---

## What You Built

- A complete full-stack web application
- Secure authentication with email/password
- A data-driven architecture that scales without code changes
- Row-level security protecting user data
- A partner system with invite codes
- Conflict detection and transfer requests
- A playful, responsive UI with animations

Not bad for a first project!
