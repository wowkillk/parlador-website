-- PARLADOR / Verify only the currently authenticated account.
-- Run ONCE in the existing Supabase SQL Editor as the project database owner.
-- Does not modify member_profiles or member_verifications data.
-- Returns a boolean, no user IDs, and accepts no user-supplied parameters.

CREATE OR REPLACE FUNCTION public.is_current_user_verified_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.member_profiles AS p
      INNER JOIN public.member_verifications AS v
        ON v.user_id = p.user_id
      WHERE p.user_id = (SELECT auth.uid())
        AND p.member_number = 1
    );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_verified_founder() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_verified_founder() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_verified_founder() TO authenticated;

-- Optional read-only check of function privileges (no auth session in SQL Editor):
SELECT
  has_function_privilege('authenticated',
    'public.is_current_user_verified_founder()', 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('anon',
    'public.is_current_user_verified_founder()', 'EXECUTE') AS anon_can_execute;

-- Next: in Supabase Data API -> Settings -> Exposed functions,
-- expose ONLY public.is_current_user_verified_founder.
-- Do NOT expose public.member_verifications.
-- On the website, this RPC runs with the signed-in user's JWT.
-- Calling the SQL function from the SQL Editor is not a valid logged-in-user test.
