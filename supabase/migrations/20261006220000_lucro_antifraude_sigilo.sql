/*
# Lucro correto, controle contra fraude e sigilo para funcionários

1. Contas pagas entram no caixa
   - contas.forma_pagamento: como a conta foi paga (dinheiro sai da gaveta).
   - caixa.conta_id: liga a saída do caixa à conta (no máximo uma saída por conta).
   - Trigger: ao marcar a conta como paga, cria a saída no caixa; ao desfazer, remove;
     ao mudar o valor/data de uma conta paga, atualiza a saída.
   - Contas já pagas antes desta migration ganham a saída correspondente.

2. Exclusão só pelo dono, com motivo e histórico
   - caixa.excluido_em / excluido_por / motivo_exclusao (exclusão "suave": o registro fica guardado).
   - Ninguém apaga lançamento pela API; só a função excluir_lancamento (dono, com motivo).
   - Editar lançamento: só o dono.
   - Reabrir caixa fechado e apagar fechamento: só o dono.

3. Sigilo para funcionário
   - Contas a pagar: só o dono vê e mexe.
   - Caixa e fechamentos: funcionário vê e lança apenas hoje e ontem.
   - Taxas das formas de pagamento: só o dono altera.
*/

-- Dia de hoje no horário de Brasília
CREATE OR REPLACE FUNCTION public.hoje_sp()
RETURNS date LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date $$;

-- ============ COLUNAS NOVAS ============
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS forma_pagamento text;

ALTER TABLE public.caixa
  ADD COLUMN IF NOT EXISTS conta_id uuid REFERENCES public.contas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criado_por uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS excluido_em timestamptz,
  ADD COLUMN IF NOT EXISTS excluido_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_exclusao text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_caixa_conta ON public.caixa (conta_id) WHERE conta_id IS NOT NULL;

-- ============ CATEGORIA DA DESPESA A PARTIR DA CATEGORIA DA CONTA ============
CREATE OR REPLACE FUNCTION public.categoria_despesa_da_conta(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'aluguel' THEN 'aluguel'
    WHEN 'agua' THEN 'contas_consumo'
    WHEN 'luz' THEN 'contas_consumo'
    WHEN 'gas' THEN 'contas_consumo'
    WHEN 'internet' THEN 'contas_consumo'
    WHEN 'fornecedor' THEN 'fornecedor'
    WHEN 'funcionario' THEN 'funcionario'
    WHEN 'imposto' THEN 'impostos'
    ELSE 'outro'
  END
$$;

-- ============ TRIGGER: CONTA PAGA -> SAÍDA NO CAIXA ============
CREATE OR REPLACE FUNCTION public.sincronizar_conta_caixa()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pago' THEN
    INSERT INTO public.caixa (restaurante_id, data, descricao, valor, tipo, categoria, forma_pagamento, taxa, conta_id, criado_por)
    VALUES (NEW.restaurante_id, coalesce(NEW.pago_em, public.hoje_sp()), 'Conta paga: ' || NEW.nome, NEW.valor, 'saida',
            public.categoria_despesa_da_conta(NEW.categoria), coalesce(NEW.forma_pagamento, 'pix'), 0, NEW.id, auth.uid())
    ON CONFLICT (conta_id) WHERE conta_id IS NOT NULL DO UPDATE
      SET data = EXCLUDED.data, descricao = EXCLUDED.descricao, valor = EXCLUDED.valor,
          categoria = EXCLUDED.categoria, forma_pagamento = EXCLUDED.forma_pagamento,
          excluido_em = NULL, excluido_por = NULL, motivo_exclusao = NULL;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pago' THEN
    DELETE FROM public.caixa WHERE conta_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conta_caixa ON public.contas;
CREATE TRIGGER trg_conta_caixa
  AFTER INSERT OR UPDATE OF status, valor, pago_em, forma_pagamento, nome, categoria ON public.contas
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_conta_caixa();

-- Contas já pagas: cria a saída que faltava
INSERT INTO public.caixa (restaurante_id, data, descricao, valor, tipo, categoria, forma_pagamento, taxa, conta_id)
SELECT c.restaurante_id, coalesce(c.pago_em, c.vencimento), 'Conta paga: ' || c.nome, c.valor, 'saida',
       public.categoria_despesa_da_conta(c.categoria), coalesce(c.forma_pagamento, 'pix'), 0, c.id
FROM public.contas c
WHERE c.status = 'pago'
  AND NOT EXISTS (SELECT 1 FROM public.caixa x WHERE x.conta_id = c.id);

-- ============ CAIXA: PERMISSÕES ============
DROP POLICY IF EXISTS "restaurante_caixa" ON public.caixa;
DROP POLICY IF EXISTS "caixa_select" ON public.caixa;
DROP POLICY IF EXISTS "caixa_insert" ON public.caixa;
DROP POLICY IF EXISTS "caixa_update" ON public.caixa;

-- Dono vê tudo; funcionário só hoje e ontem
CREATE POLICY "caixa_select" ON public.caixa FOR SELECT TO authenticated
  USING (restaurante_id = public.meu_restaurante() AND (public.sou_dono() OR data >= public.hoje_sp() - 1));

-- Todos lançam; funcionário só em hoje/ontem; ninguém lança já excluído nem ligado a conta
CREATE POLICY "caixa_insert" ON public.caixa FOR INSERT TO authenticated
  WITH CHECK (restaurante_id = public.meu_restaurante()
              AND (public.sou_dono() OR data >= public.hoje_sp() - 1)
              AND excluido_em IS NULL AND conta_id IS NULL);

-- Editar: só o dono (e não pode "excluir" por aqui: exclusão é pela função com motivo)
CREATE POLICY "caixa_update" ON public.caixa FOR UPDATE TO authenticated
  USING (restaurante_id = public.meu_restaurante() AND public.sou_dono() AND excluido_em IS NULL)
  WITH CHECK (restaurante_id = public.meu_restaurante() AND excluido_em IS NULL);

-- Apagar de verdade: ninguém
REVOKE DELETE ON public.caixa FROM authenticated;

-- Exclusão com motivo (só o dono)
CREATE OR REPLACE FUNCTION public.excluir_lancamento(p_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE l public.caixa;
BEGIN
  IF NOT public.sou_dono() THEN RAISE EXCEPTION 'Só o dono pode excluir lançamentos'; END IF;
  IF coalesce(trim(p_motivo), '') = '' THEN RAISE EXCEPTION 'Informe o motivo da exclusão'; END IF;
  SELECT * INTO l FROM public.caixa WHERE id = p_id AND restaurante_id = public.meu_restaurante();
  IF l.id IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado'; END IF;
  IF l.conta_id IS NOT NULL THEN RAISE EXCEPTION 'Este lançamento vem de uma conta paga. Desfaça o pagamento na aba Contas.'; END IF;
  UPDATE public.caixa SET excluido_em = now(), excluido_por = auth.uid(), motivo_exclusao = trim(p_motivo) WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.excluir_lancamento(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_lancamento(uuid, text) TO authenticated;

-- ============ CONTAS: SÓ O DONO ============
DROP POLICY IF EXISTS "restaurante_contas" ON public.contas;
CREATE POLICY "restaurante_contas" ON public.contas FOR ALL TO authenticated
  USING (restaurante_id = public.meu_restaurante() AND public.sou_dono())
  WITH CHECK (restaurante_id = public.meu_restaurante() AND public.sou_dono());

-- ============ FECHAMENTOS ============
DROP POLICY IF EXISTS "restaurante_fechamentos_caixa" ON public.fechamentos_caixa;
DROP POLICY IF EXISTS "fechamentos_select" ON public.fechamentos_caixa;
DROP POLICY IF EXISTS "fechamentos_insert" ON public.fechamentos_caixa;
DROP POLICY IF EXISTS "fechamentos_update" ON public.fechamentos_caixa;
DROP POLICY IF EXISTS "fechamentos_delete" ON public.fechamentos_caixa;

CREATE POLICY "fechamentos_select" ON public.fechamentos_caixa FOR SELECT TO authenticated
  USING (restaurante_id = public.meu_restaurante() AND (public.sou_dono() OR data >= public.hoje_sp() - 1));
CREATE POLICY "fechamentos_insert" ON public.fechamentos_caixa FOR INSERT TO authenticated
  WITH CHECK (restaurante_id = public.meu_restaurante() AND (public.sou_dono() OR data >= public.hoje_sp() - 1));
-- Funcionário só mexe em caixa ABERTO (abrir/fechar); reabrir um fechado é só o dono
CREATE POLICY "fechamentos_update" ON public.fechamentos_caixa FOR UPDATE TO authenticated
  USING (restaurante_id = public.meu_restaurante() AND (public.sou_dono() OR (status = 'aberto' AND data >= public.hoje_sp() - 1)))
  WITH CHECK (restaurante_id = public.meu_restaurante());
CREATE POLICY "fechamentos_delete" ON public.fechamentos_caixa FOR DELETE TO authenticated
  USING (restaurante_id = public.meu_restaurante() AND public.sou_dono());

-- ============ FORMAS DE PAGAMENTO: todos leem, só o dono altera ============
DROP POLICY IF EXISTS "restaurante_formas_pagamento" ON public.formas_pagamento;
DROP POLICY IF EXISTS "formas_select" ON public.formas_pagamento;
DROP POLICY IF EXISTS "formas_dono" ON public.formas_pagamento;
CREATE POLICY "formas_select" ON public.formas_pagamento FOR SELECT TO authenticated
  USING (restaurante_id = public.meu_restaurante());
CREATE POLICY "formas_dono" ON public.formas_pagamento FOR ALL TO authenticated
  USING (restaurante_id = public.meu_restaurante() AND public.sou_dono())
  WITH CHECK (restaurante_id = public.meu_restaurante() AND public.sou_dono());
