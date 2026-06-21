-- ============================================================
-- FIX: Make per-category scenario prompts data-driven (#12)
--
-- The scenario-picker heading was hardcoded in code keyed by category slug,
-- which broke the "adding a category = inserting a DB row" promise. Move it
-- into a categories.scenario_prompt column. Apply in the Supabase SQL Editor.
-- Idempotent — safe to run more than once.
-- ============================================================

alter table public.categories add column if not exists scenario_prompt text;

update public.categories
  set scenario_prompt = 'What''s been coming up around money?'
  where slug = 'finances' and scenario_prompt is null;

update public.categories
  set scenario_prompt = 'What''s been coming up at home?'
  where slug = 'household' and scenario_prompt is null;

update public.categories
  set scenario_prompt = 'What''s been coming up in how you relate to each other?'
  where slug = 'emotional' and scenario_prompt is null;
