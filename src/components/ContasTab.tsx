import { useMemo, useState } from 'react';
import { Trash2, Check, Pencil, Repeat, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { traduzErro } from '../lib/data';
import { type ContaItem, CATEGORIAS_CONTA, labelOf, todayISO, addDays, addMonths, situacaoConta, formatBRL, formatDatePt, monthKeyOffset } from '../types';
import { PageHeader, EmptyState, IconBtn, PrimaryBtn, Modal, FieldLabel, Th, Td, inputClass, TableWrap, Segmented, Stat, Badge, MoneyInput, parseValor, useToast } from './ui';

interface ContasTabProps {
  contas: ContaItem[];
  setContas: (next: ContaItem[]) => void;
}

type Filtro = 'pendentes' | 'pagas' | 'todas';

const formVazio = () => ({ id: '', nome: '', categoria: 'fornecedor', valor: '', vencimento: todayISO(), recorrente: false });


export default function ContasTab({ contas, setContas }: ContasTabProps) {
  const toast = useToast();
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(formVazio());
  const [salvando, setSalvando] = useState(false);
  const hoje = todayISO();

  const pendentes = contas.filter((c) => c.status !== 'pago');
  const vencidas = pendentes.filter((c) => c.vencimento < hoje);
  const proximos7 = pendentes.filter((c) => c.vencimento >= hoje && c.vencimento <= addDays(hoje, 7));
  const mesAtual = monthKeyOffset(0);
  const pagasNoMes = contas.filter((c) => c.status === 'pago' && (c.pago_em || c.vencimento).startsWith(mesAtual));
  const soma = (l: ContaItem[]) => l.reduce((s, c) => s + Number(c.valor), 0);

  const lista = useMemo(() => {
    const l = contas.filter((c) => filtro === 'todas' || (filtro === 'pagas' ? c.status === 'pago' : c.status !== 'pago'));
    return l.sort((a, b) => filtro === 'pagas' ? (a.vencimento < b.vencimento ? 1 : -1) : (a.vencimento > b.vencimento ? 1 : -1));
  }, [contas, filtro]);

  const salvar = async () => {
    const valor = parseValor(form.valor);
    if (!form.nome.trim()) return toast('Informe o nome da conta.', 'erro');
    if (!(valor > 0)) return toast('Informe um valor maior que zero.', 'erro');
    const registro = { nome: form.nome.trim(), categoria: form.categoria, valor, vencimento: form.vencimento, recorrente: form.recorrente };
    setSalvando(true);
    const { data, error } = form.id
      ? await supabase.from('contas').update(registro).eq('id', form.id).select().single()
      : await supabase.from('contas').insert({ ...registro, status: 'pendente' }).select().single();
    setSalvando(false);
    if (error) return toast(traduzErro(error.message), 'erro');
    setContas(form.id ? contas.map((c) => (c.id === form.id ? (data as ContaItem) : c)) : [...contas, data as ContaItem]);
    toast(form.id ? 'Conta atualizada.' : 'Conta cadastrada.');
    setOpen(false);
  };

  const pagar = async (c: ContaItem) => {
    const { error } = await supabase.from('contas').update({ status: 'pago', pago_em: hoje }).eq('id', c.id);
    if (error) return toast(traduzErro(error.message), 'erro');
    let novas = contas.map((x) => (x.id === c.id ? { ...x, status: 'pago' as const, pago_em: hoje } : x));

    // Conta recorrente: já cria a do próximo mês
    if (c.recorrente) {
      const prox = addMonths(c.vencimento, 1);
      const jaExiste = contas.some((x) => x.nome === c.nome && x.vencimento === prox);
      if (!jaExiste) {
        const { data, error: e2 } = await supabase.from('contas')
          .insert({ nome: c.nome, categoria: c.categoria, valor: c.valor, vencimento: prox, status: 'pendente', recorrente: true })
          .select().single();
        if (e2) toast(traduzErro(e2.message), 'erro');
        else { novas = [...novas, data as ContaItem]; toast(`Paga! A próxima (${formatDatePt(prox)}) já foi criada.`); setContas(novas); return; }
      }
    }
    setContas(novas);
    toast('Conta marcada como paga.');
  };

  const desfazerPagamento = async (c: ContaItem) => {
    const { error } = await supabase.from('contas').update({ status: 'pendente', pago_em: null }).eq('id', c.id);
    if (error) return toast(traduzErro(error.message), 'erro');
    setContas(contas.map((x) => (x.id === c.id ? { ...x, status: 'pendente' as const, pago_em: null } : x)));
  };

  const remover = async (c: ContaItem) => {
    if (!window.confirm(`Excluir a conta "${c.nome}"?`)) return;
    const { error } = await supabase.from('contas').delete().eq('id', c.id);
    if (error) return toast(traduzErro(error.message), 'erro');
    setContas(contas.filter((x) => x.id !== c.id));
    setOpen(false);
    toast('Conta excluída.');
  };

  const editar = (c: ContaItem) => {
    setForm({ id: c.id, nome: c.nome, categoria: c.categoria, valor: String(c.valor).replace('.', ','), vencimento: c.vencimento, recorrente: !!c.recorrente });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader title="Contas a pagar" subtitle="Fornecedores, aluguel, luz, água e tudo que tem vencimento.">
        <PrimaryBtn onClick={() => { setForm(formVazio()); setOpen(true); }}>Nova conta</PrimaryBtn>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Vencidas" value={formatBRL(soma(vencidas))} hint={`${vencidas.length} conta${vencidas.length === 1 ? '' : 's'}`} color={vencidas.length ? '#B33A3A' : undefined} small />
        <Stat label="Próximos 7 dias" value={formatBRL(soma(proximos7))} hint={`${proximos7.length} conta${proximos7.length === 1 ? '' : 's'}`} color={proximos7.length ? '#8A6D1E' : undefined} small />
        <Stat label="Total pendente" value={formatBRL(soma(pendentes))} hint={`${pendentes.length} conta${pendentes.length === 1 ? '' : 's'}`} small />
        <Stat label="Pago este mês" value={formatBRL(soma(pagasNoMes))} color="#2F6F62" small />
      </div>

      <div className="mb-3">
        <Segmented<Filtro> value={filtro} onChange={setFiltro} options={[
          { id: 'pendentes', label: `A pagar (${pendentes.length})` }, { id: 'pagas', label: 'Pagas' }, { id: 'todas', label: 'Todas' },
        ]} />
      </div>

      {lista.length === 0 ? (
        <TableWrap><EmptyState text={filtro === 'pendentes' ? 'Nenhuma conta a pagar. Tudo em dia!' : 'Nenhuma conta aqui.'} /></TableWrap>
      ) : (
        <>
          <div className="md:hidden flex flex-col gap-2">
            {lista.map((c) => {
              const s = situacaoConta(c, hoje);
              return (
                <div key={c.id} className="bg-white border border-card-border rounded-lg p-3" style={{ opacity: c.status === 'pago' ? 0.7 : 1 }}>
                  <div className="flex justify-between gap-2" onClick={() => editar(c)}>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate flex items-center gap-1.5">{c.nome}{c.recorrente && <Repeat size={12} className="text-[#8A8270] shrink-0" />}</div>
                      <div className="text-[12px] text-[#8A8270]">{formatDatePt(c.vencimento)} · {labelOf(CATEGORIAS_CONTA, c.categoria)}</div>
                    </div>
                    <div className="font-mono font-semibold text-sm whitespace-nowrap">{formatBRL(c.valor)}</div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    {c.status === 'pago'
                      ? <button onClick={() => desfazerPagamento(c)} className="text-[12.5px] font-semibold text-[#6B6355] bg-transparent border-none cursor-pointer">Desfazer</button>
                      : <button onClick={() => pagar(c)} className="flex items-center gap-1 text-[12.5px] font-semibold text-[#F2EFE4] bg-green border-none rounded-md px-3 py-1.5 cursor-pointer"><Check size={13} /> Paguei</button>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <TableWrap>
              <table className="w-full border-collapse">
                <thead><tr><Th>Vencimento</Th><Th>Conta</Th><Th>Categoria</Th><Th right>Valor</Th><Th>Situação</Th><Th></Th></tr></thead>
                <tbody>
                  {lista.map((c) => {
                    const s = situacaoConta(c, hoje);
                    return (
                      <tr key={c.id} style={{ opacity: c.status === 'pago' ? 0.65 : 1 }}>
                        <Td className="font-mono text-[#8A8270] whitespace-nowrap">{formatDatePt(c.vencimento)}</Td>
                        <Td className="font-semibold">
                          <span className="inline-flex items-center gap-1.5">{c.nome}{c.recorrente && <span title="Repete todo mês"><Repeat size={13} className="text-[#8A8270]" /></span>}</span>
                        </Td>
                        <Td className="text-[#8A8270]">{labelOf(CATEGORIAS_CONTA, c.categoria)}</Td>
                        <Td className="font-mono text-right whitespace-nowrap">{formatBRL(c.valor)}</Td>
                        <Td><Badge tone={s.tone}>{s.label}{c.status === 'pago' && c.pago_em ? ` em ${formatDatePt(c.pago_em)}` : ''}</Badge></Td>
                        <Td>
                          <div className="flex justify-end items-center gap-1">
                            {c.status === 'pago'
                              ? <IconBtn onClick={() => desfazerPagamento(c)} title="Desfazer pagamento"><RotateCcw size={15} /></IconBtn>
                              : <button onClick={() => pagar(c)} className="flex items-center gap-1 text-[12.5px] font-semibold text-[#F2EFE4] bg-green border-none rounded-md px-2.5 py-1 cursor-pointer hover:bg-green-dark"><Check size={13} /> Paguei</button>}
                            <IconBtn onClick={() => editar(c)} title="Editar"><Pencil size={15} /></IconBtn>
                            <IconBtn onClick={() => remover(c)} color="#B33A3A" title="Excluir"><Trash2 size={15} /></IconBtn>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </>
      )}

      {open && (
        <Modal title={form.id ? 'Editar conta' : 'Nova conta a pagar'} onClose={() => setOpen(false)}>
          <FieldLabel>Nome</FieldLabel>
          <input className={inputClass} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Aluguel, Enel, Distribuidora de bebidas" autoFocus />
          <FieldLabel>Categoria</FieldLabel>
          <select className={inputClass} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIAS_CONTA.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <FieldLabel>Valor</FieldLabel>
              <MoneyInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} />
            </div>
            <div>
              <FieldLabel>Vencimento</FieldLabel>
              <input className={inputClass} type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
            </div>
          </div>
          <label className="flex items-start gap-2.5 mt-4 cursor-pointer text-sm">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#163A2E]" checked={form.recorrente} onChange={(e) => setForm({ ...form, recorrente: e.target.checked })} />
            <span><b>Repete todo mês</b><br /><span className="text-[12.5px] text-[#8A8270]">Ao marcar como paga, a conta do mês seguinte é criada automaticamente.</span></span>
          </label>
          <div className="mt-5"><PrimaryBtn onClick={salvar} disabled={salvando} icon={false} full>{salvando ? 'Salvando...' : 'Salvar conta'}</PrimaryBtn></div>
          {form.id && (
            <button onClick={() => { const c = contas.find((x) => x.id === form.id); if (c) remover(c); }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 bg-transparent border-none text-red text-[13px] font-semibold cursor-pointer">
              <Trash2 size={14} /> Excluir conta
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
