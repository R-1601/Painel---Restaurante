/*
# Multi-restaurante + correções de segurança

## O que muda
1. Cada restaurante (cliente) tem os próprios dados. Tudo que existia antes vai
   para um restaurante "Meu Restaurante", já ativo, ligado às contas atuais.
2. Cadastro:
   - Dono: informa o nome do restaurante. O restaurante nasce "pendente" e só
     libera depois que o administrador da plataforma ativar.
   - Funcionário: informa o código de convite do restaurante. Entra "pendente"
     e o dono aprova na aba Equipe.
3. Assinatura: restaurantes.pago_ate. Se a data passar, o acesso é bloqueado
   automaticamente até o administrador renovar.
4. Segurança:
   - Antes, QUALQUER usuário logado (inclusive pendente/recusado) lia e alterava
     todos os dados pela API, e conseguia se promover a admin editando o próprio
     perfil. Agora:
     - dados só são acessíveis por usuários aprovados de restaurante ativo e
       em dia, e apenas do próprio restaurante;
     - perfis não podem mais ser alterados direto pela API, só por funções
       que validam quem pode fazer o quê.
5. Novas tabelas: fechamentos_caixa e estoque_movimentos.
6. contas: recorrente (repete todo mês) e pago_em.
*/

-- ============ RESTAURANTES ============
CREATE TABLE IF NOT EXISTS public.restaurantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','ativo','bloqueado')),
  pago_ate date,
  codigo_convite text NOT NULL UNIQUE DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurantes ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES: vínculo com restaurante ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS restaurante_id uuid REFERENCES public.restaurantes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'dono' CHECK (papel IN ('dono','funcionario')),
  ADD COLUMN IF NOT EXISTS nome text;

-- Restaurante padrão para os dados que já existem
INSERT INTO public.restaurantes (nome, status)
SELECT 'Meu Restaurante', 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.restaurantes);

UPDATE public.profiles
SET restaurante_id = (SELECT id FROM public.restaurantes ORDER BY created_at LIMIT 1),
    papel = CASE WHEN role = 'admin' THEN 'dono' ELSE 'funcionario' END
WHERE restaurante_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_restaurante ON public.profiles (restaurante_id);

-- ============ FUNÇÕES DE ACESSO ============
-- Restaurante do usuário logado, SOMENTE se ele estiver aprovado e o
-- restaurante ativo e com assinatura em dia. Caso contrário, NULL (sem acesso).
CREATE OR REPLACE FUNCTION public.meu_restaurante()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.restaurante_id
  FROM public.profiles p
  JOIN public.restaurantes r ON r.id = p.restaurante_id
  WHERE p.id = auth.uid()
    AND p.status = 'aprovado'
    AND r.status = 'ativo'
    AND (r.pago_ate IS NULL OR r.pago_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
$$;

-- Restaurante ao qual o usuário está vinculado (mesmo pendente/bloqueado),
-- usado só para ele conseguir ver o nome/status do próprio restaurante.
CREATE OR REPLACE FUNCTION public.meu_restaurante_vinculado()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT restaurante_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.sou_dono()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND papel = 'dono' AND status = 'aprovado'
      AND restaurante_id IS NOT NULL AND restaurante_id = public.meu_restaurante()
  )
$$;

REVOKE ALL ON FUNCTION public.meu_restaurante(), public.meu_restaurante_vinculado(), public.sou_dono() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_restaurante(), public.meu_restaurante_vinculado(), public.sou_dono() TO authenticated;

-- ============ RESTAURANTES: RLS (somente leitura via API) ============
DROP POLICY IF EXISTS "restaurantes_select" ON public.restaurantes;
CREATE POLICY "restaurantes_select" ON public.restaurantes
  FOR SELECT TO authenticated
  USING (id = public.meu_restaurante_vinculado() OR public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.restaurantes FROM anon, authenticated;

-- ============ PROFILES: fechar alteração direta ============
DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_or_admin_profiles" ON public.profiles;
DROP POLICY IF EXISTS "delete_admin_profiles" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR (public.sou_dono() AND restaurante_id = public.meu_restaurante())
  );
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;

-- ============ TABELAS DE DADOS: restaurante_id + RLS ============
DO $$
DECLARE
  t text;
  rid uuid := (SELECT id FROM public.restaurantes ORDER BY created_at LIMIT 1);
BEGIN
  FOREACH t IN ARRAY ARRAY['estoque','caixa','contas','formas_pagamento'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS restaurante_id uuid REFERENCES public.restaurantes(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET restaurante_id = %L WHERE restaurante_id IS NULL', t, rid);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN restaurante_id SET DEFAULT public.meu_restaurante()', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN restaurante_id SET NOT NULL', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_delete_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'restaurante_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (restaurante_id = public.meu_restaurante()) WITH CHECK (restaurante_id = public.meu_restaurante())',
      'restaurante_' || t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (restaurante_id)', 'idx_' || t || '_restaurante', t);
  END LOOP;
END $$;

-- formas_pagamento: o id ('pix', 'dinheiro'...) passa a ser único por restaurante
ALTER TABLE public.formas_pagamento DROP CONSTRAINT IF EXISTS formas_pagamento_pkey;
ALTER TABLE public.formas_pagamento ADD PRIMARY KEY (restaurante_id, id);

CREATE INDEX IF NOT EXISTS idx_caixa_restaurante_data ON public.caixa (restaurante_id, data);

-- ============ CONTAS: recorrência ============
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pago_em date;

-- ============ FECHAMENTO DE CAIXA ============
CREATE TABLE IF NOT EXISTS public.fechamentos_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL DEFAULT public.meu_restaurante() REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  data date NOT NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado')),
  troco_inicial numeric NOT NULL DEFAULT 0,
  dinheiro_contado numeric,
  dinheiro_esperado numeric,
  diferenca numeric,
  total_vendas numeric,
  total_despesas numeric,
  observacao text,
  aberto_por uuid DEFAULT auth.uid(),
  fechado_por uuid,
  fechado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurante_id, data)
);

-- ============ MOVIMENTAÇÃO DE ESTOQUE ============
CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL DEFAULT public.meu_restaurante() REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.estoque(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade numeric NOT NULL,
  saldo_apos numeric NOT NULL,
  motivo text,
  criado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_item ON public.estoque_movimentos (item_id, created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fechamentos_caixa','estoque_movimentos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'restaurante_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (restaurante_id = public.meu_restaurante()) WITH CHECK (restaurante_id = public.meu_restaurante())',
      'restaurante_' || t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (restaurante_id)', 'idx_' || t || '_restaurante', t);
  END LOOP;
END $$;

-- Histórico é só de inserção: ninguém edita/apaga movimentação pela API
REVOKE UPDATE, DELETE ON public.estoque_movimentos FROM authenticated;

-- ============ FORMAS DE PAGAMENTO PADRÃO ============
CREATE OR REPLACE FUNCTION public.criar_formas_padrao(p_restaurante uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.formas_pagamento (restaurante_id, id, label, taxa, ordem) VALUES
    (p_restaurante, 'dinheiro', 'Dinheiro', 0, 1),
    (p_restaurante, 'pix', 'Pix', 0, 2),
    (p_restaurante, 'cartao_debito', 'Cartão de débito', 1.9, 3),
    (p_restaurante, 'cartao_credito', 'Cartão de crédito', 3.5, 4),
    (p_restaurante, 'ifood', 'iFood', 12, 5),
    (p_restaurante, 'rappi', 'Rappi', 12, 6)
  ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.criar_formas_padrao(uuid) FROM PUBLIC, anon, authenticated;

-- ============ CADASTRO (trigger em auth.users) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_admin boolean := lower(NEW.email) = 'robert-fc@outlook.com';
  v_codigo text := upper(trim(coalesce(meta->>'codigo_convite', '')));
  v_nome_rest text := nullif(trim(coalesce(meta->>'restaurante', '')), '');
  v_nome text := nullif(trim(coalesce(meta->>'nome', '')), '');
  rid uuid;
BEGIN
  IF v_codigo <> '' THEN
    -- Funcionário entrando num restaurante existente
    SELECT id INTO rid FROM public.restaurantes WHERE codigo_convite = v_codigo;
    IF rid IS NULL THEN
      RAISE EXCEPTION 'Código de convite inválido';
    END IF;
    INSERT INTO public.profiles (id, email, nome, status, role, papel, restaurante_id)
    VALUES (NEW.id, NEW.email, v_nome,
            CASE WHEN v_admin THEN 'aprovado' ELSE 'pendente' END,
            CASE WHEN v_admin THEN 'admin' ELSE 'usuario' END,
            'funcionario', rid);
  ELSE
    -- Dono criando um restaurante novo
    INSERT INTO public.restaurantes (nome, status)
    VALUES (coalesce(v_nome_rest, 'Meu restaurante'), CASE WHEN v_admin THEN 'ativo' ELSE 'pendente' END)
    RETURNING id INTO rid;
    PERFORM public.criar_formas_padrao(rid);
    INSERT INTO public.profiles (id, email, nome, status, role, papel, restaurante_id)
    VALUES (NEW.id, NEW.email, v_nome, 'aprovado',
            CASE WHEN v_admin THEN 'admin' ELSE 'usuario' END,
            'dono', rid);
  END IF;
  RETURN NEW;
END;
$$;

-- ============ RPCs ============
-- Valida o código de convite antes do cadastro (mostra o nome do restaurante)
CREATE OR REPLACE FUNCTION public.validar_convite(p_codigo text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT nome FROM public.restaurantes WHERE codigo_convite = upper(trim(p_codigo))
$$;
GRANT EXECUTE ON FUNCTION public.validar_convite(text) TO anon, authenticated;

-- Aprovar / recusar usuário: admin da plataforma (qualquer um) ou dono (só funcionários do próprio restaurante)
CREATE OR REPLACE FUNCTION public.definir_status_usuario(p_usuario uuid, p_status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE alvo public.profiles;
BEGIN
  IF p_status NOT IN ('pendente','aprovado','recusado') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;
  SELECT * INTO alvo FROM public.profiles WHERE id = p_usuario;
  IF alvo.id IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  IF alvo.id = auth.uid() THEN RAISE EXCEPTION 'Você não pode alterar o próprio acesso'; END IF;
  IF NOT (
    public.is_admin()
    OR (public.sou_dono() AND alvo.restaurante_id = public.meu_restaurante() AND alvo.papel = 'funcionario')
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.profiles SET status = p_status WHERE id = p_usuario;
END;
$$;

-- Admin da plataforma: ativar/bloquear restaurante e controlar assinatura
CREATE OR REPLACE FUNCTION public.admin_atualizar_restaurante(p_restaurante uuid, p_status text, p_pago_ate date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_status NOT IN ('pendente','ativo','bloqueado') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  UPDATE public.restaurantes SET status = p_status, pago_ate = p_pago_ate WHERE id = p_restaurante;
END;
$$;

-- Dono: renomear restaurante
CREATE OR REPLACE FUNCTION public.renomear_restaurante(p_nome text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.sou_dono() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF coalesce(trim(p_nome), '') = '' THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
  UPDATE public.restaurantes SET nome = trim(p_nome) WHERE id = public.meu_restaurante();
END;
$$;

-- Dono: gerar novo código de convite (invalida o anterior)
CREATE OR REPLACE FUNCTION public.novo_codigo_convite()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE novo text;
BEGIN
  IF NOT public.sou_dono() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  novo := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  UPDATE public.restaurantes SET codigo_convite = novo WHERE id = public.meu_restaurante();
  RETURN novo;
END;
$$;

-- Movimentar estoque de forma atômica (roda com as permissões do usuário: RLS vale)
CREATE OR REPLACE FUNCTION public.movimentar_estoque(p_item uuid, p_tipo text, p_quantidade numeric, p_motivo text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE novo_saldo numeric;
BEGIN
  IF p_tipo NOT IN ('entrada','saida','ajuste') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF p_quantidade IS NULL OR p_quantidade < 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

  UPDATE public.estoque
  SET qtd = CASE
              WHEN p_tipo = 'entrada' THEN qtd + p_quantidade
              WHEN p_tipo = 'saida' THEN greatest(0, qtd - p_quantidade)
              ELSE p_quantidade
            END
  WHERE id = p_item
  RETURNING qtd INTO novo_saldo;

  IF novo_saldo IS NULL THEN RAISE EXCEPTION 'Item não encontrado'; END IF;

  INSERT INTO public.estoque_movimentos (item_id, tipo, quantidade, saldo_apos, motivo)
  VALUES (p_item, p_tipo, p_quantidade, novo_saldo, nullif(trim(coalesce(p_motivo, '')), ''));

  RETURN novo_saldo;
END;
$$;

REVOKE ALL ON FUNCTION public.definir_status_usuario(uuid, text), public.admin_atualizar_restaurante(uuid, text, date),
  public.renomear_restaurante(text), public.novo_codigo_convite(), public.movimentar_estoque(uuid, text, numeric, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_status_usuario(uuid, text), public.admin_atualizar_restaurante(uuid, text, date),
  public.renomear_restaurante(text), public.novo_codigo_convite(), public.movimentar_estoque(uuid, text, numeric, text)
  TO authenticated;
