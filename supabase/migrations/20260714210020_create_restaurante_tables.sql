/*
# Create restaurant management tables (single-tenant, no auth)

## Overview
Creates four tables for a restaurant management dashboard: estoque (inventory),
caixa (cash register / transactions), contas (bills to pay), and formas_pagamento
(payment methods with tax rates). This is a single-tenant app with no sign-in screen,
so all policies allow anon + authenticated full CRUD.

## New Tables

1. estoque
   - id (uuid, PK, default gen_random_uuid())
   - nome (text, not null) — item name
   - qtd (numeric, default 0) — current quantity
   - unidade (text, default 'un') — unit of measure
   - minimo (numeric, default 0) — minimum stock threshold for alerts
   - created_at (timestamptz, default now())

2. caixa
   - id (uuid, PK, default gen_random_uuid())
   - data (date, not null) — transaction date
   - descricao (text, not null) — description (renamed from 'desc' which is a PG reserved word)
   - valor (numeric, not null) — amount
   - tipo (text, not null) — 'entrada' or 'saida'
   - canal (text) — sales channel for entradas (delivery/balcao/retirada)
   - forma_pagamento (text) — payment method id for entradas
   - taxa (numeric, default 0) — tax rate percentage for entradas
   - categoria (text) — expense category for saidas
   - created_at (timestamptz, default now())

3. contas
   - id (uuid, PK, default gen_random_uuid())
   - nome (text, not null) — bill name
   - categoria (text, not null) — category (agua/luz/fornecedor/aluguel/outro)
   - valor (numeric, not null) — amount
   - vencimento (date, not null) — due date
   - status (text, not null, default 'pendente') — 'pendente' or 'pago'
   - created_at (timestamptz, default now())

4. formas_pagamento
   - id (text, PK) — payment method id (dinheiro, pix, etc.)
   - label (text, not null) — display name
   - taxa (numeric, default 0) — tax rate percentage
   - ordem (int, default 0) — display order
   - created_at (timestamptz, default now())

## Security
- RLS enabled on all four tables.
- All policies use TO anon, authenticated with USING (true) / WITH CHECK (true)
  because this is a single-tenant app with no sign-in screen — the data is
  intentionally public/shared.

## Seed Data
- formas_pagamento seeded with 6 default payment methods.
*/

-- ============ ESTOQUE ============
CREATE TABLE IF NOT EXISTS estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  qtd numeric NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'un',
  minimo numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_estoque" ON estoque;
CREATE POLICY "anon_select_estoque" ON estoque FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_estoque" ON estoque;
CREATE POLICY "anon_insert_estoque" ON estoque FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_estoque" ON estoque;
CREATE POLICY "anon_update_estoque" ON estoque FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_estoque" ON estoque;
CREATE POLICY "anon_delete_estoque" ON estoque FOR DELETE
  TO anon, authenticated USING (true);

-- ============ CAIXA ============
CREATE TABLE IF NOT EXISTS caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  canal text,
  forma_pagamento text,
  taxa numeric NOT NULL DEFAULT 0,
  categoria text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE caixa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_caixa" ON caixa;
CREATE POLICY "anon_select_caixa" ON caixa FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_caixa" ON caixa;
CREATE POLICY "anon_insert_caixa" ON caixa FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_caixa" ON caixa;
CREATE POLICY "anon_update_caixa" ON caixa FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_caixa" ON caixa;
CREATE POLICY "anon_delete_caixa" ON caixa FOR DELETE
  TO anon, authenticated USING (true);

-- ============ CONTAS ============
CREATE TABLE IF NOT EXISTS contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_contas" ON contas;
CREATE POLICY "anon_select_contas" ON contas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_contas" ON contas;
CREATE POLICY "anon_insert_contas" ON contas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_contas" ON contas;
CREATE POLICY "anon_update_contas" ON contas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_contas" ON contas;
CREATE POLICY "anon_delete_contas" ON contas FOR DELETE
  TO anon, authenticated USING (true);

-- ============ FORMAS_PAGAMENTO ============
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id text PRIMARY KEY,
  label text NOT NULL,
  taxa numeric NOT NULL DEFAULT 0,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_formas_pagamento" ON formas_pagamento;
CREATE POLICY "anon_select_formas_pagamento" ON formas_pagamento FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_formas_pagamento" ON formas_pagamento;
CREATE POLICY "anon_insert_formas_pagamento" ON formas_pagamento FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_formas_pagamento" ON formas_pagamento;
CREATE POLICY "anon_update_formas_pagamento" ON formas_pagamento FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_formas_pagamento" ON formas_pagamento;
CREATE POLICY "anon_delete_formas_pagamento" ON formas_pagamento FOR DELETE
  TO anon, authenticated USING (true);

-- ============ SEED: FORMAS_PAGAMENTO ============
INSERT INTO formas_pagamento (id, label, taxa, ordem) VALUES
  ('dinheiro', 'Dinheiro', 0, 1),
  ('pix', 'Pix', 0, 2),
  ('cartao_debito', 'Cartão de débito', 1.9, 3),
  ('cartao_credito', 'Cartão de crédito', 3.5, 4),
  ('ifood', 'iFood', 12, 5),
  ('rappi', 'Rappi', 12, 6)
ON CONFLICT (id) DO NOTHING;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_caixa_data ON caixa (data);
CREATE INDEX IF NOT EXISTS idx_caixa_tipo ON caixa (tipo);
CREATE INDEX IF NOT EXISTS idx_contas_vencimento ON contas (vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_status ON contas (status);
