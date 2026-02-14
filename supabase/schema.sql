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
-- 8. ROW LEVEL SECURITY (RLS)
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
