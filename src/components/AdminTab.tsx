import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { traduzErro } from '../lib/data';
import type { Profile } from '../lib/auth';
import { type Restaurante, formatDatePt, todayISO, addMonths, daysBetween } from '../types';
import { PageHeader, Badge, GhostBtn, Stat, TableWrap, Th, Td, EmptyState, Segmented, inputClass, useToast } from './ui';

type Filtro = 'todos' | 'pendente' | 'ativo' | 'vencendo' | 'bloqueado';

export default function AdminTab() {
  const toast = useToast();
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [perfis, setPerfis] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const hoje = todayISO();

  const carregar = useCallback(async () => {
    setLoading(true);
    const [r, p] = await Promise.all([
      supabase.from('restaurantes').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, nome, status, role, papel, restaurante_id, created_at'),
    ]);
    if (r.error) toast(traduzErro(r.error.message), 'erro');
    setRestaurantes((r.data || []) as Restaurante[]);
    setPerfis((p.data || []) as Profile[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const situacao = (r: Restaurante) => {
    if (r.status === 'pendente') return { tone: 'gold' as const, label: 'Aguardando ativação', key: 'pendente' };
    if (r.status === 'bloqueado') return { tone: 'red' as const, label: 'Bloqueado', key: 'bloqueado' };
    if (r.pago_ate && r.pago_ate < hoje) return { tone: 'red' as const, label: `Venceu ${formatDatePt(r.pago_ate)}`, key: 'vencendo' };
    if (r.pago_ate && daysBetween(hoje, r.pago_ate) <= 5) return { tone: 'gold' as const, label: `Vence ${formatDatePt(r.pago_ate)}`, key: 'vencendo' };
    return { tone: 'green' as const, label: r.pago_ate ? `Pago até ${formatDatePt(r.pago_ate)}` : 'Ativo (sem vencimento)', key: 'ativo' };
  };

  const atualizar = async (r: Restaurante, status: Restaurante['status'], pago_ate: string | null, msg: string) => {
    setBusy(r.id);
    const { error } = await supabase.rpc('admin_atualizar_restaurante', { p_restaurante: r.id, p_status: status, p_pago_ate: pago_ate });
    setBusy(null);
    if (error) return toast(traduzErro(error.message), 'erro');
    setRestaurantes((l) => l.map((x) => (x.id === r.id ? { ...x, status, pago_ate } : x)));
    toast(msg);
  };

  // +1 mês a partir do vencimento atual (ou de hoje, se já venceu / não tem)
  const renovar = (r: Restaurante) => {
    const base = r.pago_ate && r.pago_ate >= hoje ? r.pago_ate : hoje;
    const novo = addMonths(base, 1);
    atualizar(r, 'ativo', novo, `${r.nome}: pago até ${formatDatePt(novo)}.`);
  };

  const donoDe = (rid: string) => perfis.find((p) => p.restaurante_id === rid && p.papel === 'dono');
  const qtdUsuarios = (rid: string) => perfis.filter((p) => p.restaurante_id === rid && p.status === 'aprovado').length;

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return restaurantes.filter((r) => {
      if (filtro !== 'todos' && situacao(r).key !== filtro) return false;
      if (!q) return true;
      const d = donoDe(r.id);
      return r.nome.toLowerCase().includes(q) || d?.email.toLowerCase().includes(q) || d?.nome?.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantes, perfis, filtro, busca]);

  const ativosPagantes = restaurantes.filter((r) => r.status === 'ativo' && (!r.pago_ate || r.pago_ate >= hoje)).length;
  const pendentes = restaurantes.filter((r) => r.status === 'pendente').length;
  const vencendo = restaurantes.filter((r) => situacao(r).key === 'vencendo').length;
  const precoMensal = Number(import.meta.env.VITE_PRECO_MENSAL || 29);

  return (
    <div>
      <PageHeader title="Admin da plataforma" subtitle="Ative novos restaurantes, controle as assinaturas e bloqueie quem não pagou.">
        <GhostBtn onClick={carregar}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Atualizar</GhostBtn>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Restaurantes ativos" value={String(ativosPagantes)} small />
        <Stat label="Receita mensal estimada" value={(ativosPagantes * precoMensal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} hint={`${ativosPagantes} × R$ ${precoMensal}`} color="#2F6F62" small />
        <Stat label="Aguardando ativação" value={String(pendentes)} color={pendentes ? '#8A6D1E' : undefined} small />
        <Stat label="Vencidos / vencendo" value={String(vencendo)} color={vencendo ? '#B33A3A' : undefined} small />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-3 md:items-center">
        <Segmented<Filtro> value={filtro} onChange={setFiltro} options={[
          { id: 'todos', label: 'Todos' }, { id: 'pendente', label: 'Novos' }, { id: 'vencendo', label: 'Cobrar' },
          { id: 'ativo', label: 'Em dia' }, { id: 'bloqueado', label: 'Bloqueados' },
        ]} />
        <div className="relative md:w-[280px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8270]" />
          <input className={`${inputClass} pl-9`} placeholder="Buscar restaurante ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      <TableWrap>
        {lista.length === 0 ? <EmptyState text={loading ? 'Carregando...' : 'Nenhum restaurante aqui.'} /> : (
          <table className="w-full border-collapse min-w-[760px]">
            <thead><tr><Th>Restaurante</Th><Th>Dono</Th><Th>Usuários</Th><Th>Situação</Th><Th>Pago até</Th><Th></Th></tr></thead>
            <tbody>
              {lista.map((r) => {
                const s = situacao(r);
                const d = donoDe(r.id);
                return (
                  <tr key={r.id}>
                    <Td>
                      <div className="font-semibold">{r.nome}</div>
                      <div className="text-[12px] text-[#8A8270]">desde {formatDatePt(r.created_at)}</div>
                    </Td>
                    <Td><div>{d?.nome || '—'}</div><div className="text-[12px] text-[#8A8270]">{d?.email}</div></Td>
                    <Td className="text-center font-mono">{qtdUsuarios(r.id)}</Td>
                    <Td><Badge tone={s.tone}>{s.label}</Badge></Td>
                    <Td>
                      <input type="date" className="px-2 py-1 rounded-md border border-card-border text-[13px] bg-[#FCFAF4]" value={r.pago_ate || ''}
                        onChange={(e) => atualizar(r, r.status, e.target.value || null, 'Vencimento atualizado.')} />
                    </Td>
                    <Td>
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        <button disabled={busy === r.id} onClick={() => renovar(r)}
                          className="bg-green text-[#F2EFE4] border-none px-2.5 py-1.5 rounded-md text-[12.5px] font-semibold cursor-pointer hover:bg-green-dark disabled:opacity-60 whitespace-nowrap">
                          {r.status === 'pendente' ? 'Ativar 1 mês' : '+1 mês'}
                        </button>
                        {r.status !== 'bloqueado' ? (
                          <button disabled={busy === r.id} onClick={() => window.confirm(`Bloquear ${r.nome}? Ninguém do restaurante consegue acessar até você liberar.`) && atualizar(r, 'bloqueado', r.pago_ate, `${r.nome} bloqueado.`)}
                            className="bg-white text-red border border-red/40 px-2.5 py-1.5 rounded-md text-[12.5px] font-semibold cursor-pointer hover:bg-red-bg disabled:opacity-60">Bloquear</button>
                        ) : (
                          <button disabled={busy === r.id} onClick={() => atualizar(r, 'ativo', r.pago_ate, `${r.nome} desbloqueado.`)}
                            className="bg-white text-teal border border-teal/40 px-2.5 py-1.5 rounded-md text-[12.5px] font-semibold cursor-pointer hover:bg-teal-bg disabled:opacity-60">Desbloquear</button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableWrap>
      <p className="text-[12.5px] text-[#8A8270] mt-3">Quando a data de “Pago até” passa, o acesso do restaurante é bloqueado automaticamente, e os dados continuam guardados. Deixe a data em branco para um acesso sem vencimento.</p>
    </div>
  );
}
