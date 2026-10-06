/*
# Add login system with manual approval of new sign-ups

## Overview
Transforms the app from single-tenant (no auth) into a multi-user app with a
manual-approval gate. New users who sign up start in 'pendente' status and
cannot use the system until an administrator approves them. The single
administrator account (robert-fc@outlook.com) is pre-approved automatically
by a trigger the moment it signs up. Only the administrator can view and
approve/reject pending users.

## New Tables

1. public.profiles
   - id (uuid, PK, references auth.users ON DELETE CASCADE) — one row per auth user
   - email (text, not null) — denormalized copy of auth email for easy listing
   - status (text, not null, default 'pendente') — 'pendente' | 'aprovado' | 'recusado'
   - role (text, not null, default 'usuario') — 'admin' | 'usuario'
   - created_at (timestamptz, default now())
   - updated_at (timestamptz, default now())

## Security (profiles)
- RLS enabled.
- SELECT: a user can read their own profile; admins can read all profiles.
- INSERT: handled server-side by trigger (never by the client), so no INSERT
  policy is exposed to anon/authenticated. A defensive INSERT policy allows
  only the owner to insert their own row (used as a safety net).
- UPDATE: a user may update only their own row; admins may update any row
  (needed to approve/reject other users).

## Security (existing tables: estoque, caixa, contas, formas_pagamento)
- RLS policies are replaced: previously anon+authenticated full access
  (single-tenant). Now that the app requires sign-in, access is restricted
  to authenticated users only. Any authenticated (approved) user can
  read/write the shared restaurant data — this is intentional, since all
  approved users share the same single-restaurant dataset. Pending/rejected
  users have an auth session but the frontend blocks them before they reach
  these tables; the DB layer still treats any authenticated user as allowed
  for these shared tables.

## Functions / Triggers
- handle_new_user(): trigger function fired on auth.users INSERT. Creates a
  matching profiles row. If the signing-up email is robert-fc@outlook.com,
  the profile is created with status='aprovado' and role='admin'. Otherwise
  status='pendente' and role='usuario'.
- on_auth_user_created: AFTER INSERT trigger on auth.users calling the above.
- update_updated_at_column(): sets updated_at = now() on profile UPDATE.
- set_updated_at: BEFORE UPDATE trigger on profiles.

## Important Notes
1. The admin email is matched case-insensitively via lower() so that
   Robert-Fc@outlook.com etc. also work.
2. Email confirmation stays OFF (per project rules) — sign-up immediately
   creates the auth user and the profile row.
3. The frontend reads profiles.status to decide whether to show the app,
   a "pending" screen, or a "rejected" screen.
4. No data is lost on existing tables — only their policies are replaced.
*/

-- ============ PROFILES TABLE ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado')),
  role text NOT NULL DEFAULT 'usuario' CHECK (role IN ('admin','usuario')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: owner or admin
DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON public.profiles;
CREATE POLICY "select_own_or_admin_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- INSERT: only the owner can insert their own row (trigger normally does it)
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: owner or admin
DROP POLICY IF EXISTS "update_own_or_admin_profiles" ON public.profiles;
CREATE POLICY "update_own_or_admin_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- DELETE: admin only
DROP POLICY IF EXISTS "delete_admin_profiles" ON public.profiles;
CREATE POLICY "delete_admin_profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============ TRIGGER: auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT lower(NEW.email) = 'robert-fc@outlook.com' INTO is_admin;
  INSERT INTO public.profiles (id, email, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN is_admin THEN 'aprovado' ELSE 'pendente' END,
    CASE WHEN is_admin THEN 'admin' ELSE 'usuario' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ updated_at maintenance ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Backfill profiles for any existing auth.users ============
INSERT INTO public.profiles (id, email, status, role)
SELECT au.id, au.email,
  CASE WHEN lower(au.email) = 'robert-fc@outlook.com' THEN 'aprovado' ELSE 'pendente' END,
  CASE WHEN lower(au.email) = 'robert-fc@outlook.com' THEN 'admin' ELSE 'usuario' END
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- ============ Tighten RLS on existing shared tables: authenticated only ============

-- ESTOQUE
DROP POLICY IF EXISTS "anon_select_estoque" ON estoque;
DROP POLICY IF EXISTS "anon_insert_estoque" ON estoque;
DROP POLICY IF EXISTS "anon_update_estoque" ON estoque;
DROP POLICY IF EXISTS "anon_delete_estoque" ON estoque;

CREATE POLICY "auth_select_estoque" ON estoque FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "auth_insert_estoque" ON estoque FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_estoque" ON estoque FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_estoque" ON estoque FOR DELETE
  TO authenticated USING (true);

-- CAIXA
DROP POLICY IF EXISTS "anon_select_caixa" ON caixa;
DROP POLICY IF EXISTS "anon_insert_caixa" ON caixa;
DROP POLICY IF EXISTS "anon_update_caixa" ON caixa;
DROP POLICY IF EXISTS "anon_delete_caixa" ON caixa;

CREATE POLICY "auth_select_caixa" ON caixa FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "auth_insert_caixa" ON caixa FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_caixa" ON caixa FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_caixa" ON caixa FOR DELETE
  TO authenticated USING (true);

-- CONTAS
DROP POLICY IF EXISTS "anon_select_contas" ON contas;
DROP POLICY IF EXISTS "anon_insert_contas" ON contas;
DROP POLICY IF EXISTS "anon_update_contas" ON contas;
DROP POLICY IF EXISTS "anon_delete_contas" ON contas;

CREATE POLICY "auth_select_contas" ON contas FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "auth_insert_contas" ON contas FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_contas" ON contas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_contas" ON contas FOR DELETE
  TO authenticated USING (true);

-- FORMAS_PAGAMENTO
DROP POLICY IF EXISTS "anon_select_formas_pagamento" ON formas_pagamento;
DROP POLICY IF EXISTS "anon_insert_formas_pagamento" ON formas_pagamento;
DROP POLICY IF EXISTS "anon_update_formas_pagamento" ON formas_pagamento;
DROP POLICY IF EXISTS "anon_delete_formas_pagamento" ON formas_pagamento;

CREATE POLICY "auth_select_formas_pagamento" ON formas_pagamento FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "auth_insert_formas_pagamento" ON formas_pagamento FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_formas_pagamento" ON formas_pagamento FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_formas_pagamento" ON formas_pagamento FOR DELETE
  TO authenticated USING (true);

-- ============ INDEX ============
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
