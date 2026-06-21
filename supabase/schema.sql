-- ============================================================
-- "Who's Got The Ball?" — Full Database Schema (v2: guided session)
-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor > New Query).
--
-- This script DROPS and RECREATES everything in the public schema for a clean state.
-- Safe to re-run. DESTRUCTIVE to existing user data — only run on a dev DB or before launch.
-- ============================================================

-- --------------------------------------------------------
-- 0. DROPS (run-anywhere reset)
-- --------------------------------------------------------
drop table if exists public.check_ins cascade;
drop table if exists public.session_actions cascade;
drop table if exists public.session_responses cascade;
drop table if exists public.sessions cascade;
drop table if exists public.scenarios cascade;
drop table if exists public.transfers cascade;     -- removed in v2
drop table if exists public.answers cascade;       -- removed in v2
drop table if exists public.questions cascade;     -- removed in v2
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.get_my_partner_id() cascade;
drop function if exists public.link_partners(text) cascade;
drop function if exists public.unlink_partners() cascade;
drop function if exists public.accept_transfer(uuid) cascade;  -- removed in v2

-- --------------------------------------------------------
-- 1. PROFILES TABLE
-- Extends auth.users with app-specific data.
-- Every user gets a profile automatically (see trigger below).
-- --------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  invite_code text unique,          -- code others use to partner with this user
  partner_id uuid references public.profiles(id),
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- --------------------------------------------------------
-- 2. CATEGORIES TABLE
-- The three areas of the relationship a session can focus on.
-- --------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,        -- "finances" | "household" | "emotional"
  description text,                 -- subtext shown under the category card
  color text not null,
  icon text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- --------------------------------------------------------
-- 3. SCENARIOS TABLE
-- Preset prompts a user can pick at the top-level scenario picker
-- AND inside each category.
--
-- A row with category_id = null is a TOP-LEVEL scenario
-- (shown on the "What's been coming up for you lately?" screen).
-- A row with a category_id is a per-category scenario
-- (shown after the user selects a category).
-- --------------------------------------------------------
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  scenario_text text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- --------------------------------------------------------
-- 4. SESSIONS TABLE
-- One row per couple's guided discussion.
-- A session is "owned" by both partners — RLS lets either of them read/write.
-- --------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  initiator_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,

  -- Top-level "what's been coming up" scenario (preset OR free text)
  top_scenario_id uuid references public.scenarios(id),
  top_scenario_custom text,

  -- Categories the user selected as "where this is showing up" (multi-select; for analytics)
  selected_category_ids uuid[] not null default '{}',

  -- The single category being drilled into this session
  focal_category_id uuid not null references public.categories(id),

  -- The focal scenario from that category (preset OR free text)
  focal_scenario_id uuid references public.scenarios(id),
  focal_scenario_custom text,

  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index sessions_initiator_idx on public.sessions(initiator_id);
create index sessions_partner_idx on public.sessions(partner_id);

-- --------------------------------------------------------
-- 5. SESSION_RESPONSES TABLE
-- Each partner's three answers (Who / Why / Expectation) for a session.
-- One row per user per session.
-- --------------------------------------------------------
create table public.session_responses (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  who_has_ball text not null check (who_has_ball in ('me', 'you', 'both_dropped', 'not_sure')),

  -- Why: a preset value OR 'custom' with the text in why_custom
  why text not null,
  why_custom text,

  -- Expectation: same pattern as why
  expectation text not null,
  expectation_custom text,

  submitted_at timestamptz default now(),
  primary key (session_id, user_id)
);

-- --------------------------------------------------------
-- 6. SESSION_ACTIONS TABLE
-- The "Make the shift" commitments — what action each partner will take
-- and what language they want to use.
-- --------------------------------------------------------
create table public.session_actions (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  action text not null,            -- preset value OR 'custom'
  action_custom text,
  language text not null,          -- preset value OR 'custom'
  language_custom text,

  submitted_at timestamptz default now(),
  primary key (session_id, user_id)
);

-- --------------------------------------------------------
-- 7. CHECK_INS TABLE
-- Scheduled reminders to follow up on a session.
-- One per user per session (each partner can opt in independently).
-- --------------------------------------------------------
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_for date not null,
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'completed')),
  created_at timestamptz default now()
);

create index check_ins_user_due_idx on public.check_ins(user_id, scheduled_for) where status = 'pending';

-- --------------------------------------------------------
-- 8. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- --------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    substr(md5(random()::text), 1, 8)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------
-- 8b. BACKFILL PROFILES FOR EXISTING AUTH USERS
-- The trigger above only fires on NEW signups. Re-running this script
-- after dropping `public.profiles` would leave already-signed-up users
-- without a profile row (and therefore no invite_code). This backfill
-- creates a profile for any auth.user that doesn't already have one.
-- Idempotent — safe to re-run.
-- --------------------------------------------------------
insert into public.profiles (id, display_name, invite_code)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  substr(md5(random()::text), 1, 8)
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id
);

-- --------------------------------------------------------
-- 9. HELPER FUNCTION FOR RLS
-- SECURITY DEFINER bypasses RLS so policies can subquery profiles
-- without infinite recursion.
-- --------------------------------------------------------
create or replace function public.get_my_partner_id()
returns uuid as $$
  select partner_id from public.profiles where id = auth.uid();
$$ language sql security definer stable set search_path = '';

-- Returns true if the current user is the initiator or partner of the given
-- session. SECURITY DEFINER so RLS policies on session_* tables can check
-- membership without recursively triggering the sessions table's own RLS.
create or replace function public.is_session_member(session_id_input uuid)
returns boolean as $$
  select exists (
    select 1 from public.sessions s
    where s.id = session_id_input
      and (s.initiator_id = auth.uid() or s.partner_id = auth.uid())
  );
$$ language sql security definer stable set search_path = '';

-- --------------------------------------------------------
-- 10. PARTNER LINKING FUNCTIONS (SECURITY DEFINER)
-- Bypass RLS so we can update BOTH partners' profiles atomically.
-- --------------------------------------------------------

create or replace function public.link_partners(invite_code_input text)
returns jsonb as $$
declare
  current_user_id uuid := auth.uid();
  partner_record record;
  current_partner_id uuid;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select id, display_name, partner_id
    into partner_record
    from public.profiles
    where invite_code = invite_code_input;

  if not found then
    return jsonb_build_object('error', 'Invalid invite code. Please check and try again.');
  end if;

  if partner_record.id = current_user_id then
    return jsonb_build_object('error', 'You can''t partner with yourself!');
  end if;

  if partner_record.partner_id is not null then
    return jsonb_build_object('error', 'This person is already partnered with someone else.');
  end if;

  select partner_id into current_partner_id
    from public.profiles
    where id = current_user_id;

  if current_partner_id is not null then
    return jsonb_build_object('error', 'You already have a partner. Unlink first to partner with someone new.');
  end if;

  update public.profiles set partner_id = partner_record.id where id = current_user_id;
  update public.profiles set partner_id = current_user_id where id = partner_record.id;

  return jsonb_build_object('success', true, 'partner_name', partner_record.display_name);
end;
$$ language plpgsql security definer set search_path = '';

create or replace function public.unlink_partners()
returns jsonb as $$
declare
  current_user_id uuid := auth.uid();
  partner_user_id uuid;
begin
  if current_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select partner_id into partner_user_id
    from public.profiles
    where id = current_user_id;

  if partner_user_id is null then
    return jsonb_build_object('error', 'You don''t have a partner to unlink.');
  end if;

  update public.profiles set partner_id = null where id = current_user_id;
  update public.profiles set partner_id = null where id = partner_user_id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer set search_path = '';

-- --------------------------------------------------------
-- 11. ROW LEVEL SECURITY
-- --------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.scenarios enable row level security;
alter table public.sessions enable row level security;
alter table public.session_responses enable row level security;
alter table public.session_actions enable row level security;
alter table public.check_ins enable row level security;

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can view partner profile"
  on public.profiles for select
  using (id = public.get_my_partner_id());

-- NOTE: there is deliberately NO blanket "look up any profile by invite code"
-- SELECT policy. Partner linking happens via the link_partners() SECURITY
-- DEFINER function (which bypasses RLS to look up the inviter), so clients
-- never need direct read access to other users' profiles. A blanket policy
-- here would expose every user's id, display_name, invite_code, and
-- partner_id to any authenticated user.

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- CATEGORIES (public reference data)
create policy "Categories are readable by all authenticated users"
  on public.categories for select
  to authenticated
  using (true);

-- SCENARIOS (public reference data)
create policy "Scenarios are readable by all authenticated users"
  on public.scenarios for select
  to authenticated
  using (true);

-- SESSIONS: either partner of the session can read/write it
create policy "Users can view sessions they're part of"
  on public.sessions for select
  using (auth.uid() = initiator_id or auth.uid() = partner_id);

create policy "Users can create sessions where they are the initiator"
  on public.sessions for insert
  with check (auth.uid() = initiator_id);

create policy "Users can update sessions they're part of"
  on public.sessions for update
  using (auth.uid() = initiator_id or auth.uid() = partner_id);

-- SESSION_RESPONSES: a user can read both responses (theirs + partner's) and
-- write only their OWN response, and ONLY in a session they belong to. The
-- is_session_member() check is what stops a stranger from writing a row into
-- another couple's session (the user_id check alone does not — it only proves
-- the row is attributed to the caller, not that the caller is in the session).
create policy "Users can view responses for their sessions"
  on public.session_responses for select
  using (public.is_session_member(session_id));

create policy "Users can insert their own response"
  on public.session_responses for insert
  with check (auth.uid() = user_id and public.is_session_member(session_id));

create policy "Users can update their own response"
  on public.session_responses for update
  using (auth.uid() = user_id and public.is_session_member(session_id))
  with check (auth.uid() = user_id and public.is_session_member(session_id));

-- SESSION_ACTIONS: same pattern as session_responses. Membership on insert is
-- also what protects submitAction's "count >= 2 -> completed" logic: without
-- it, a non-member could inject a row and inflate the count.
create policy "Users can view actions for their sessions"
  on public.session_actions for select
  using (public.is_session_member(session_id));

create policy "Users can insert their own action"
  on public.session_actions for insert
  with check (auth.uid() = user_id and public.is_session_member(session_id));

create policy "Users can update their own action"
  on public.session_actions for update
  using (auth.uid() = user_id and public.is_session_member(session_id))
  with check (auth.uid() = user_id and public.is_session_member(session_id));

-- CHECK_INS: each user owns their own check-ins, and may only create them for
-- a session they belong to.
create policy "Users can view their own check-ins"
  on public.check_ins for select
  using (auth.uid() = user_id);

create policy "Users can create their own check-ins"
  on public.check_ins for insert
  with check (auth.uid() = user_id and public.is_session_member(session_id));

create policy "Users can update their own check-ins"
  on public.check_ins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------
-- 12. SEED DATA — Categories
-- --------------------------------------------------------
insert into public.categories (name, slug, description, color, icon, sort_order) values
  ('Financial', 'finances', 'Money decisions, bills, or who handles what', '#F59E0B', 'wallet', 1),
  ('Household', 'household', 'Cleaning, chores, or things that need to get done', '#14B8A6', 'home', 2),
  ('Emotional', 'emotional', 'How you talk, show up, and support each other', '#A78BFA', 'heart', 3);

-- --------------------------------------------------------
-- 13. SEED DATA — Scenarios
-- Top-level scenarios (category_id = null) are shown first.
-- Per-category scenarios are shown after the user picks categories.
-- --------------------------------------------------------

-- Top-level: "What's been coming up for you lately?"
insert into public.scenarios (category_id, scenario_text, sort_order) values
  (null, 'We keep arguing about the same thing', 1),
  (null, 'I feel like I''m doing more than they are', 2),
  (null, 'They don''t follow through on things', 3),
  (null, 'I avoid bringing things up', 4),
  (null, 'Things feel off but I can''t explain why', 5);

-- Financial: "What's been coming up around money?"
insert into public.scenarios (category_id, scenario_text, sort_order)
select id, s.text, s.sort
from public.categories,
  (values
    ('We don''t agree how to spend money', 1),
    ('Paying the bills', 2),
    ('I feel like I''m carrying more of the financial responsibility', 3),
    ('They don''t follow through on financial commitments', 4),
    ('We avoid talking about money', 5),
    ('I don''t know who''s responsible for what financially', 6)
  ) as s(text, sort)
where slug = 'finances';

-- Household: "What's been coming up at home?"
insert into public.scenarios (category_id, scenario_text, sort_order)
select id, s.text, s.sort
from public.categories,
  (values
    ('Keeping the space clean', 1),
    ('Doing the dishes / kitchen responsibilities', 2),
    ('Laundry not getting done', 3),
    ('General chores not being shared', 4),
    ('Having to remind them about tasks', 5)
  ) as s(text, sort)
where slug = 'household';

-- Emotional: "What's been coming up in how you relate to each other?"
insert into public.scenarios (category_id, scenario_text, sort_order)
select id, s.text, s.sort
from public.categories,
  (values
    ('Having the same argument over and over', 1),
    ('Bringing things up leads to tension', 2),
    ('One of us shuts down during conversations', 3),
    ('Feeling unheard or misunderstood', 4),
    ('Avoiding difficult conversations', 5)
  ) as s(text, sort)
where slug = 'emotional';
