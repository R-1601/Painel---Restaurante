import { useCallback, useEffect, useState } from 'react';
import { Check, X, Copy, RefreshCw, Store, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { traduzErro } from '../lib/data';
import type { Profile } from '../lib/auth';
import { type Restaurante, formatDatePt } from '../types';
import { PageHeader, Card, Badge, EmptyState, inputClass, PrimaryBtn, GhostBtn, useToast, useConfirmar } from './ui';

export default function EquipeTab({ restaurante, onRefresh }: { restaurante: Restaurante; onRefresh: () => Promise<void> }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [membros, setMembros] = useState<Profile[]>([]);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [nome, setNome] = useState(restaurante.nome);
  const [codigo, setCodigo] = useState(restaurante.codigo_convite);
  const [busy, setBusy] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    setMeuId(u.user?.id || null);
    const { data, error } = await supabase.from('profiles')
      .select('id, email, nome, status, role, papel, restaurante_id, created_at')
      .eq('restaurante_id', restaurante.id).order('created_at');
    if (error) toast(traduzErro(error.message), 'erro');
    setMembros((data || []) as Profile[]);
  }, [restaurante.id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const setStatus = async (p: Profile, status: 'aprovado' | 'recusado') => {
    setBusy(p.id);
    const { error } = await supabase.rpc('definir_status_usuario', { p_usuario: p.id, p_status: status });
    setBusy(null);
    if (error) return toast(traduzErro(error.message), 'erro');
    setMembros((m) => m.map((x) => (x.id === p.id ? { ...x, status } : x)));
    toast(status === 'aprovado' ? `${p.nome || p.email} agora tem acesso.` : `Acesso de ${p.nome || p.email} removido.`);
  };

  const renomear = async () => {
    const { error } = await supabase.rpc('renomear_restaurante', { p_nome: nome });
    if (error) return toast(traduzErro(error.message), 'erro');
    toast('Nome atualizado.');
    onRefresh();
  };

  const novoCodigo = async () => {
    if (!(await confirmar({ titulo: 'Gerar um novo código?', texto: 'O código atual deixa de funcionar para novos cadastros.', acao: 'Gerar novo código' }))) return;
    const { data, error } = await supabase.rpc('novo_codigo_convite');
    if (error) return toast(traduzErro(error.message), 'erro');
    setCodigo(data as string);
    toast('Novo código gerado.');
  };

  const copiar = async () => {
    const texto = `Você foi convidado para a equipe de ${restaurante.nome} no Painel do Restaurante.\nAcesse ${window.location.origin}, clique em "Tenho convite" e use o código: ${codigo}`;
    try { await navigator.clipboard.writeText(texto); toast('Convite copiado. Cole no WhatsApp do funcionário.'); }
    catch { window.prompt('Copie o convite:', texto); }
  };

  const pendentes = membros.filter((m) => m.status === 'pendente');
  const ativos = membros.filter((m) => m.status === 'aprovado');
  const recusados = membros.filter((m) => m.status === 'recusado');

  return (
    <div>
      <PageHeader title="Restaurante e equipe" subtitle="Dados do restaurante, convite de funcionários e quem tem acesso." />

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold text-[15px] mb-3"><Store size={17} /> Restaurante</div>
          <label className="block text-[12.5px] font-semibold text-pimenta-2 mb-1.5">Nome</label>
          <div className="flex gap-2">
            <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} />
            <PrimaryBtn onClick={renomear} icon={false} disabled={!nome.trim() || nome === restaurante.nome}>Salvar</PrimaryBtn>
          </div>
          <div className="text-[13px] text-pimenta-3 mt-4">
            Assinatura: {restaurante.pago_ate ? <>ativa até <b>{formatDatePt(restaurante.pago_ate)}</b></> : <b>ativa</b>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold text-[15px] mb-1"><Users size={17} /> Convidar funcionário</div>
          <p className="text-[13px] text-pimenta-3 mt-0 mb-3">O funcionário se cadastra com este código, e você aprova aqui embaixo. Funcionários veem Caixa, Fechamento e Estoque, mas não veem relatórios nem contas.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="tabular-nums text-[26px] font-bold tracking-[0.25em] text-pimenta bg-pele rounded-lg px-4 py-2">{codigo}</div>
            <GhostBtn onClick={copiar}><Copy size={15} /> Copiar convite</GhostBtn>
            <button onClick={novoCodigo} className="pressionar min-h-[40px] md:min-h-0 px-2 -mx-2 rounded-lg text-[12.5px] font-semibold text-pimenta-2 bg-transparent border-none cursor-pointer flex items-center gap-1 hover:bg-pele"><RefreshCw size={13} /> Gerar outro</button>
          </div>
        </Card>
      </div>

      {pendentes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display text-[18px] font-bold text-pimenta mb-3">Aguardando sua aprovação ({pendentes.length})</h3>
          <div className="flex flex-col gap-2">
            {pendentes.map((p) => (
              <Card key={p.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{p.nome || p.email}</div>
                  <div className="text-[12.5px] text-pimenta-3">{p.email} · cadastrado em {formatDatePt(p.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy === p.id} onClick={() => setStatus(p, 'aprovado')} className="flex items-center gap-1.5 bg-urucum text-white border-none px-3 py-2 rounded-md text-[13px] font-semibold cursor-pointer hover:bg-urucum-dark disabled:opacity-60"><Check size={14} /> Aprovar</button>
                  <button disabled={busy === p.id} onClick={() => setStatus(p, 'recusado')} className="flex items-center gap-1.5 bg-white text-erro border border-erro/40 px-3 py-2 rounded-md text-[13px] font-semibold cursor-pointer hover:bg-erro-bg disabled:opacity-60"><X size={14} /> Recusar</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-display text-[18px] font-bold text-pimenta mb-3">Com acesso ({ativos.length})</h3>
      <Card className="divide-y divide-linha mb-6">
        {ativos.length === 0 ? <EmptyState title="Ninguém com acesso ainda" text="Envie o código de convite para seus funcionários." /> : ativos.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="font-semibold truncate">{p.nome || p.email} {p.id === meuId && <span className="text-pimenta-3 font-normal">(você)</span>}</div>
              <div className="text-[12.5px] text-pimenta-3 truncate">{p.email}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge tone={p.papel === 'dono' ? 'gold' : 'neutral'}>{p.papel === 'dono' ? 'Dono' : 'Funcionário'}</Badge>
              {p.papel === 'funcionario' && (
                <button disabled={busy === p.id} onClick={async () => {
                  if (await confirmar({ titulo: `Remover o acesso de ${p.nome || p.email}?`, texto: 'A pessoa deixa de entrar no Painel. Você pode devolver o acesso depois.', acao: 'Remover acesso', perigo: true })) setStatus(p, 'recusado');
                }}
                  className="text-[12.5px] font-semibold text-pimenta-3 hover:text-erro bg-transparent border-none cursor-pointer">Remover</button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {recusados.length > 0 && (
        <>
          <h3 className="font-display text-[16px] font-bold text-pimenta mb-3">Sem acesso ({recusados.length})</h3>
          <Card className="divide-y divide-linha">
            {recusados.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-pimenta-3 truncate">{p.nome || p.email}</span>
                <button disabled={busy === p.id} onClick={() => setStatus(p, 'aprovado')} className="text-[12.5px] font-semibold text-louro bg-transparent border-none cursor-pointer">Devolver acesso</button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
