/*
# Fix RLS recursion on profiles policies

## Problem
The SELECT and UPDATE policies on public.profiles used a self-referential
subquery (SELECT 1 FROM public.profiles ...) to check whether the current
user is an admin. RLS on a table also applies to subqueries that reference
that same table, which causes recursion / unexpected empty results. The
admin's profile query could return nothing, so the frontend treated the
session as having no profile and bounced back to the login screen —
blocking even the admin from entering.

## Fix
- Add public.is_admin() SECURITY DEFINER function that reads the caller's
  role from public.profiles with an explicit role check that bypasses RLS
  (SECURITY DEFINER runs as the function owner, and we set a search_path).
  Returns true if the current auth.uid() has role = 'admin'.
- Replace the self-referential EXISTS subqueries in the SELECT and UPDATE
  policies with a call to public.is_admin().
- DELETE policy also uses public.is_admin().

## Security
- public.is_admin() is SECURITY DEFINER but only reads the profiles table
  and returns a boolean. It cannot be abused to exfiltrate data.
- No changes to the profiles table schema or to other tables.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- SELECT: owner or admin
DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON public.profiles;
CREATE POLICY "select_own_or_admin_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- INSERT: only the owner can insert their own row (trigger normally does it)
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: owner or admin
DROP POLICY IF EXISTS "update_own_or_admin_profiles" ON public.profiles;
CREATE POLICY "update_own_or_admin_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- DELETE: admin only
DROP POLICY IF EXISTS "delete_admin_profiles" ON public.profiles;
CREATE POLICY "delete_admin_profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());
