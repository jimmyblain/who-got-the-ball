-- ============================================================
-- FIX: Recursive RLS policy issue
-- The problem: policies on "answers" subquery "profiles", which
-- has policies that subquery "profiles" again → infinite loop → 500 error.
--
-- The solution: Create a helper function with SECURITY DEFINER
-- (bypasses RLS) to safely look up the partner_id.
-- ============================================================

-- Step 1: Create a safe function to get the current user's partner_id
-- SECURITY DEFINER means this function runs with full DB privileges,
-- bypassing RLS. This breaks the recursive loop.
CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS uuid AS $$
  SELECT partner_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop the problematic policies
DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view partner answers" ON public.answers;

-- Step 3: Recreate them using the safe function instead of subqueries
CREATE POLICY "Users can view partner profile"
  ON public.profiles FOR SELECT
  USING (id = public.get_my_partner_id());

CREATE POLICY "Users can view partner answers"
  ON public.answers FOR SELECT
  USING (user_id = public.get_my_partner_id());
