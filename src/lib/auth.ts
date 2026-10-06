import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Restaurante } from '../types';

export type ProfileStatus = 'pendente' | 'aprovado' | 'recusado';
export type ProfileRole = 'admin' | 'usuario';
export type Papel = 'dono' | 'funcionario';

export interface Profile {
  id: string;
  email: string;
  nome?: string | null;
  status: ProfileStatus;
  role: ProfileRole;
  papel: Papel;
  restaurante_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  restaurante: Restaurante | null;
}

const PROFILE_COLS = 'id, email, nome, status, role, papel, restaurante_id, created_at, updated_at';

export function useAuth(): AuthState & { signOut: () => Promise<void>; refresh: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ loading: true, session: null, profile: null, restaurante: null });

  const load = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ loading: false, session: null, profile: null, restaurante: null });
      return;
    }
    const { data: p, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', session.user.id).maybeSingle();
    if (error) console.error('Erro ao carregar perfil:', error);
    let restaurante: Restaurante | null = null;
    if (p?.restaurante_id) {
      const { data: r } = await supabase.from('restaurantes').select('*').eq('id', p.restaurante_id).maybeSingle();
      restaurante = (r as Restaurante) || null;
    }
    setState({ loading: false, session, profile: (p as Profile) || null, restaurante });
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) load(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Evita recarregar tudo a cada renovação de token
      if (event === 'TOKEN_REFRESHED') return;
      // setTimeout: recomendação do Supabase p/ não chamar a API dentro do callback
      setTimeout(() => { if (mounted) load(session); }, 0);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ loading: false, session: null, profile: null, restaurante: null });
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  return { ...state, signOut, refresh };
}

/** Situação de acesso, espelhando a regra do banco (public.meu_restaurante). */
export type Acesso = 'ok' | 'usuario_pendente' | 'usuario_recusado' | 'restaurante_pendente' | 'restaurante_bloqueado' | 'assinatura_vencida' | 'sem_restaurante';

export function situacaoAcesso(profile: Profile, restaurante: Restaurante | null, hoje: string): Acesso {
  if (profile.status === 'recusado') return 'usuario_recusado';
  if (profile.status === 'pendente') return 'usuario_pendente';
  if (!restaurante) return 'sem_restaurante';
  if (restaurante.status === 'pendente') return 'restaurante_pendente';
  if (restaurante.status === 'bloqueado') return 'restaurante_bloqueado';
  if (restaurante.pago_ate && restaurante.pago_ate < hoje) return 'assinatura_vencida';
  return 'ok';
}
