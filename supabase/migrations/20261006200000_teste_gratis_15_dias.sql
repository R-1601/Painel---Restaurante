/*
# Teste grátis de 15 dias
Restaurante novo (cadastro de dono) já nasce ATIVO, com pago_ate = hoje + 15 dias.
Quando o prazo vence, o acesso bloqueia sozinho até o admin renovar (+1 mês).
O admin continua podendo bloquear qualquer restaurante a qualquer momento.
*/
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
    INSERT INTO public.restaurantes (nome, status, pago_ate)
    VALUES (coalesce(v_nome_rest, 'Meu restaurante'), 'ativo',
            CASE WHEN v_admin THEN NULL ELSE (now() AT TIME ZONE 'America/Sao_Paulo')::date + 15 END)
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
