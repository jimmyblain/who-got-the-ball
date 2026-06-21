-- ============================================================
-- FIX: Session write-authorization + profile exposure hardening
--
-- Apply this to the live Supabase project (SQL Editor) after deploying.
-- It is idempotent — safe to run more than once. schema.sql already
-- reflects this final state for fresh installs.
--
-- What it fixes:
--   1. session_responses / session_actions / check_ins INSERT/UPDATE only
--      checked `auth.uid() = user_id`, never session membership — so any
--      authenticated user could write rows into another couple's session
--      (and inflate submitAction's "count >= 2 -> completed" logic).
--   2. The "Anyone can look up profiles by invite code" SELECT policy was
--      effectively `using (true)` (every profile has an invite_code), exposing
--      every user's id, display_name, invite_code, and partner_id.
--   3. SECURITY DEFINER functions did not pin search_path.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper: is the current user a member of this session?
--    SECURITY DEFINER so it can read sessions without recursing
--    through the session_* RLS policies that call it.
-- ------------------------------------------------------------
create or replace function public.is_session_member(session_id_input uuid)
returns boolean as $$
  select exists (
    select 1 from public.sessions s
    where s.id = session_id_input
      and (s.initiator_id = auth.uid() or s.partner_id = auth.uid())
  );
$$ language sql security definer stable set search_path = '';

-- ------------------------------------------------------------
-- 2. Pin search_path on existing SECURITY DEFINER functions
-- ------------------------------------------------------------
alter function public.get_my_partner_id() set search_path = '';
alter function public.link_partners(text) set search_path = '';
alter function public.unlink_partners() set search_path = '';
alter function public.handle_new_user() set search_path = '';

-- ------------------------------------------------------------
-- 3. Remove the blanket profile-lookup policy.
--    Partner linking goes through link_partners() (SECURITY DEFINER),
--    so clients never need direct read access to other profiles.
-- ------------------------------------------------------------
drop policy if exists "Anyone can look up profiles by invite code" on public.profiles;

-- ------------------------------------------------------------
-- 4. session_responses: require membership on read AND write
-- ------------------------------------------------------------
drop policy if exists "Users can view responses for their sessions" on public.session_responses;
drop policy if exists "Users can insert their own response" on public.session_responses;
drop policy if exists "Users can update their own response" on public.session_responses;

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

-- ------------------------------------------------------------
-- 5. session_actions: same pattern
-- ------------------------------------------------------------
drop policy if exists "Users can view actions for their sessions" on public.session_actions;
drop policy if exists "Users can insert their own action" on public.session_actions;
drop policy if exists "Users can update their own action" on public.session_actions;

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

-- ------------------------------------------------------------
-- 6. check_ins: require membership on insert
-- ------------------------------------------------------------
drop policy if exists "Users can create their own check-ins" on public.check_ins;
drop policy if exists "Users can update their own check-ins" on public.check_ins;

create policy "Users can create their own check-ins"
  on public.check_ins for insert
  with check (auth.uid() = user_id and public.is_session_member(session_id));

create policy "Users can update their own check-ins"
  on public.check_ins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
