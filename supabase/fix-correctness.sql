-- ============================================================
-- FIX: Correctness bugs from the session-rebuild code review
--
-- Apply this to the live Supabase project (SQL Editor) after the
-- application code is deployed. Idempotent — safe to run more than once.
-- schema.sql already reflects this final state for fresh installs.
--
-- Covers the DB-side fixes:
--   #7  submitAction completion race — completion is now done atomically by a
--       trigger that locks the session row, instead of a racy count+update in
--       app code (which could leave a fully-answered session stuck in_progress).
--   #8  Duplicate pending check-ins — a partial unique index enforces one
--       pending check-in per (session, user).
--
-- (#5, #6, #9, #10, #11 are application-only and ship with the code.)
-- ============================================================

-- ------------------------------------------------------------
-- #7. Atomic session completion when both partners have committed
-- ------------------------------------------------------------
create or replace function public.complete_session_when_both_committed()
returns trigger as $$
declare
  committed_count int;
begin
  -- Lock the session row so simultaneous commitments serialize here and the
  -- second committer reliably sees both action rows.
  perform 1 from public.sessions where id = new.session_id for update;
  select count(*) into committed_count
    from public.session_actions
    where session_id = new.session_id;
  if committed_count >= 2 then
    update public.sessions
      set status = 'completed', completed_at = now()
      where id = new.session_id and status <> 'completed';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists session_actions_complete on public.session_actions;
create trigger session_actions_complete
  after insert or update on public.session_actions
  for each row execute procedure public.complete_session_when_both_committed();

-- Backfill: complete any session that already has both commitments but was
-- left in_progress by the old racy code path.
update public.sessions s
  set status = 'completed', completed_at = coalesce(s.completed_at, now())
  where s.status <> 'completed'
    and (select count(*) from public.session_actions a where a.session_id = s.id) >= 2;

-- ------------------------------------------------------------
-- #8. One pending check-in per (session, user)
-- ------------------------------------------------------------
-- Remove any existing duplicate pending rows (keep the most recent) so the
-- unique index can be created.
delete from public.check_ins c
  using public.check_ins newer
  where c.session_id = newer.session_id
    and c.user_id = newer.user_id
    and c.status = 'pending'
    and newer.status = 'pending'
    and (c.created_at < newer.created_at
         or (c.created_at = newer.created_at and c.id < newer.id));

create unique index if not exists check_ins_one_pending_per_user
  on public.check_ins(session_id, user_id) where status = 'pending';
