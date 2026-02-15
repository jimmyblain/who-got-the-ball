-- ============================================================
-- "Who's Got The Ball?" — Full Database Schema
-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- --------------------------------------------------------
-- 1. PROFILES TABLE
-- Extends auth.users with app-specific data.
-- Every user gets a profile automatically (see trigger below).
-- --------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  invite_code text unique,          -- unique code others use to partner with this user
  partner_id uuid references public.profiles(id), -- links two users together
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- --------------------------------------------------------
-- 2. CATEGORIES TABLE
-- Stores category metadata (name, color, icon).
-- Fully data-driven: add a row here → new category appears in the app.
-- --------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,        -- URL-friendly name (e.g. "finances")
  color text not null,              -- hex color for the category card
  icon text not null,               -- icon name (used in the UI)
  sort_order int default 0,         -- controls display order
  created_at timestamptz default now()
);

-- --------------------------------------------------------
-- 3. QUESTIONS TABLE
-- Each question belongs to a category.
-- Add rows here → new questions appear in onboarding & dashboard.
-- --------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  question_text text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- --------------------------------------------------------
-- 4. ANSWERS TABLE
-- Stores each user's answer to each question.
-- Uses a composite primary key so each user can only answer each question once.
-- --------------------------------------------------------
create table public.answers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer text not null check (answer in ('mine', 'partner', 'shared')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, question_id)
);

-- --------------------------------------------------------
-- 5. TRANSFERS TABLE
-- "Pass the ball" requests between partners.
-- --------------------------------------------------------
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message text,                     -- optional message with the request
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- --------------------------------------------------------
-- 6. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- When someone signs up, this automatically creates their profile
-- with a random 8-character invite code.
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
$$ language plpgsql security definer;

-- Attach the trigger to auth.users so it fires on every new signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------
-- 7. HELPER FUNCTION FOR RLS
-- SECURITY DEFINER function that bypasses RLS to look up partner_id.
-- Without this, policies that subquery profiles would create infinite
-- recursion (profiles policies check profiles → loop).
-- --------------------------------------------------------
create or replace function public.get_my_partner_id()
returns uuid as $$
  select partner_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- --------------------------------------------------------
-- 8. PARTNER LINKING FUNCTIONS (SECURITY DEFINER)
-- These functions bypass RLS so they can update BOTH partners'
-- profiles in one go. Without these, RLS would block you from
-- updating your partner's row (because you can only update your own).
-- --------------------------------------------------------

/**
 * link_partners(invite_code_input text) → jsonb
 *
 * Validates the invite code, checks neither user is already partnered,
 * then sets partner_id on BOTH profiles (two-way link).
 * Returns { success: true, partner_name: "..." } or { error: "..." }.
 */
create or replace function public.link_partners(invite_code_input text)
returns jsonb as $$
declare
  -- The user calling this function
  current_user_id uuid := auth.uid();
  -- The partner we're linking to (looked up by invite code)
  partner_record record;
  -- The current user's existing partner_id (to check if already partnered)
  current_partner_id uuid;
begin
  -- Safety check: must be logged in
  if current_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Look up who owns this invite code
  select id, display_name, partner_id
    into partner_record
    from public.profiles
    where invite_code = invite_code_input;

  -- If no match found, the invite code is wrong
  if not found then
    return jsonb_build_object('error', 'Invalid invite code. Please check and try again.');
  end if;

  -- Can't partner with yourself!
  if partner_record.id = current_user_id then
    return jsonb_build_object('error', 'You can''t partner with yourself!');
  end if;

  -- Check if the other person already has a partner
  if partner_record.partner_id is not null then
    return jsonb_build_object('error', 'This person is already partnered with someone else.');
  end if;

  -- Check if the current user already has a partner
  select partner_id into current_partner_id
    from public.profiles
    where id = current_user_id;

  if current_partner_id is not null then
    return jsonb_build_object('error', 'You already have a partner. Unlink first to partner with someone new.');
  end if;

  -- All checks passed! Link both profiles to each other.
  -- Because this function is SECURITY DEFINER, these updates bypass RLS.
  update public.profiles set partner_id = partner_record.id where id = current_user_id;
  update public.profiles set partner_id = current_user_id where id = partner_record.id;

  return jsonb_build_object('success', true, 'partner_name', partner_record.display_name);
end;
$$ language plpgsql security definer;

/**
 * unlink_partners() → jsonb
 *
 * Clears partner_id on BOTH the current user and their partner.
 * Also cancels any pending transfers between them.
 * Returns { success: true } or { error: "..." }.
 */
create or replace function public.unlink_partners()
returns jsonb as $$
declare
  current_user_id uuid := auth.uid();
  partner_user_id uuid;
begin
  -- Safety check: must be logged in
  if current_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Get the current user's partner
  select partner_id into partner_user_id
    from public.profiles
    where id = current_user_id;

  -- If no partner, nothing to unlink
  if partner_user_id is null then
    return jsonb_build_object('error', 'You don''t have a partner to unlink.');
  end if;

  -- Clear partner_id on both profiles
  update public.profiles set partner_id = null where id = current_user_id;
  update public.profiles set partner_id = null where id = partner_user_id;

  -- Cancel any pending transfers between the two users
  update public.transfers
    set status = 'declined', updated_at = now()
    where status = 'pending'
      and (
        (from_user_id = current_user_id and to_user_id = partner_user_id)
        or (from_user_id = partner_user_id and to_user_id = current_user_id)
      );

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- --------------------------------------------------------
-- 8b. ACCEPT TRANSFER FUNCTION (SECURITY DEFINER)
-- Same pattern as link_partners: bypasses RLS so we can update
-- BOTH users' answers when a transfer is accepted.
-- Without this, RLS blocks the receiver from updating the sender's answer.
-- --------------------------------------------------------

/**
 * accept_transfer(transfer_id_input uuid) → jsonb
 *
 * Called when the receiver accepts a "pass the ball" request.
 * Validates the transfer, then in one atomic operation:
 *   1. Marks the transfer as "accepted"
 *   2. Sets the sender's answer to "partner" (they gave up the ball)
 *   3. Sets the receiver's answer to "mine" (they took the ball)
 * Returns { success: true } or { error: "..." }.
 */
create or replace function public.accept_transfer(transfer_id_input uuid)
returns jsonb as $$
declare
  -- The user calling this function (the receiver)
  current_user_id uuid := auth.uid();
  -- The transfer record we're accepting
  transfer_record record;
begin
  -- Safety check: must be logged in
  if current_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Look up the transfer
  select * into transfer_record
    from public.transfers
    where id = transfer_id_input;

  -- Check the transfer exists
  if not found then
    return jsonb_build_object('error', 'Transfer not found');
  end if;

  -- Only the receiver can accept
  if transfer_record.to_user_id != current_user_id then
    return jsonb_build_object('error', 'This transfer isn''t for you');
  end if;

  -- Must still be pending
  if transfer_record.status != 'pending' then
    return jsonb_build_object('error', 'This transfer is no longer pending');
  end if;

  -- All checks passed! Do everything in one atomic operation.

  -- 1. Mark the transfer as accepted
  update public.transfers
    set status = 'accepted', updated_at = now()
    where id = transfer_id_input;

  -- 2. Update the SENDER's answer to "partner" (they gave up the ball)
  --    This is the line that would fail without SECURITY DEFINER,
  --    because the current user (receiver) isn't the sender.
  insert into public.answers (user_id, question_id, answer, updated_at)
    values (transfer_record.from_user_id, transfer_record.question_id, 'partner', now())
    on conflict (user_id, question_id)
    do update set answer = 'partner', updated_at = now();

  -- 3. Update the RECEIVER's answer to "mine" (they took the ball)
  insert into public.answers (user_id, question_id, answer, updated_at)
    values (current_user_id, transfer_record.question_id, 'mine', now())
    on conflict (user_id, question_id)
    do update set answer = 'mine', updated_at = now();

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- --------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS)
-- These policies ensure users can only see/edit their own data
-- and their partner's data (when partnered).
-- --------------------------------------------------------

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.transfers enable row level security;

-- PROFILES: Users can read their own profile + their partner's profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can view partner profile"
  on public.profiles for select
  using (id = public.get_my_partner_id());

-- Allow reading any profile by invite_code (needed for partner linking)
create policy "Anyone can look up profiles by invite code"
  on public.profiles for select
  using (invite_code is not null);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- CATEGORIES: Everyone can read (they're public reference data)
create policy "Categories are readable by all authenticated users"
  on public.categories for select
  to authenticated
  using (true);

-- QUESTIONS: Everyone can read
create policy "Questions are readable by all authenticated users"
  on public.questions for select
  to authenticated
  using (true);

-- ANSWERS: Users can manage their own answers + read partner's
create policy "Users can view own answers"
  on public.answers for select
  using (auth.uid() = user_id);

create policy "Users can view partner answers"
  on public.answers for select
  using (user_id = public.get_my_partner_id());

create policy "Users can insert own answers"
  on public.answers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own answers"
  on public.answers for update
  using (auth.uid() = user_id);

-- TRANSFERS: Users can see transfers they're involved in
create policy "Users can view own transfers"
  on public.transfers for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can create transfers from themselves"
  on public.transfers for insert
  with check (auth.uid() = from_user_id);

create policy "Users can update transfers sent to them"
  on public.transfers for update
  using (auth.uid() = to_user_id or auth.uid() = from_user_id);

-- --------------------------------------------------------
-- 8. SEED DATA: Initial Categories & Questions
-- These are the starter categories and 5 questions each.
-- --------------------------------------------------------

-- Insert the three starter categories
insert into public.categories (name, slug, color, icon, sort_order) values
  ('Finances', 'finances', '#F59E0B', 'wallet', 1),
  ('Household', 'household', '#14B8A6', 'home', 2),
  ('Emotional', 'emotional', '#A78BFA', 'heart', 3);

-- Insert 5 questions per category
-- FINANCES
insert into public.questions (category_id, question_text, sort_order)
select id, q.text, q.sort
from public.categories,
  (values
    ('Who is responsible for paying the monthly bills?', 1),
    ('Who has the final say on big purchases?', 2),
    ('Who tracks the budget and spending?', 3),
    ('Who handles saving and investments?', 4),
    ('Who deals with financial paperwork (taxes, insurance)?', 5)
  ) as q(text, sort)
where slug = 'finances';

-- HOUSEHOLD
insert into public.questions (category_id, question_text, sort_order)
select id, q.text, q.sort
from public.categories,
  (values
    ('Who is responsible for cleaning the house?', 1),
    ('Who does the grocery shopping?', 2),
    ('Who cooks the meals?', 3),
    ('Who handles home repairs and maintenance?', 4),
    ('Who decides when to have guests over?', 5)
  ) as q(text, sort)
where slug = 'household';

-- EMOTIONAL
insert into public.questions (category_id, question_text, sort_order)
select id, q.text, q.sort
from public.categories,
  (values
    ('Who usually brings up difficult topics?', 1),
    ('Who decides when a conversation needs a break?', 2),
    ('Who initiates check-ins about the relationship?', 3),
    ('Who plans quality time together?', 4),
    ('Who reaches out first after an argument?', 5)
  ) as q(text, sort)
where slug = 'emotional';
