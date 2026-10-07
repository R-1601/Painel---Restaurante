import { useMemo, useState } from 'react';
import { Trash2, Settings, Search, Pencil, ArrowDownCircle, ArrowUpCircle, Receipt, Ban, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { traduzErro } from '../lib/data';
import {
  type CaixaItem, type FormaPagamento, CANAIS_VENDA, CATEGORIAS_DESPESA, labelOf, todayISO, addDays, formatBRL, formatDatePt,
  monthKeyOffset, monthRange, calcularTotais, valorLiquido, inRange,
} from '../types';
import {
  PageHeader, EmptyState, IconBtn, PrimaryBtn, GhostBtn, Modal, FieldLabel, Th, Td, inputClass, TableWrap, Segmented, Stat,
  MoneyInput, parseValor, useToast,
} from './ui';

interface CaixaTabProps {
  caixa: CaixaItem[];
  setCaixa: (next: CaixaItem[]) => void;
  formasPagamento: FormaPagamento[];
  setFormasPagamento: (next: FormaPagamento[]) => void;
  isDono: boolean;
}

type Periodo = 'hoje' | 'ontem' | 'mes' | 'mes_passado' | 'custom';
type Filtro = 'todos' | 'entrada' | 'saida' | 'excluidos';

const formVazio = (tipo: 'entrada' | 'saida' = 'entrada') => ({
  id: '' as string, data: todayISO(), descricao: '', valor: '', tipo,
  canal: 'balcao', forma_pagamento: tipo === 'entrada' ? 'pix' : 'dinheiro', categoria: 'ingredientes',
});

export default function CaixaTab({ caixa, setCaixa, formasPagamento, setFormasPagamento, isDono }: CaixaTabProps) {
  const toast = useToast();
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [de, setDe] = useState(todayISO());
  const [ate, setAte] = useState(todayISO());
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [open, setOpen] = useState(false);
  const [openTaxas, setOpenTaxas] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(formVazio());
  const [taxasEdit, setTaxasEdit] = useState<Record<string, string>>({});
  const [excluir, setExcluir] = useState<{ item: CaixaItem; motivo: string } | null>(null);

  const [ini, fim] = useMemo((): [string, string] => {
    const hoje = todayISO();
    if (periodo === 'hoje') return [hoje, hoje];
    if (periodo === 'ontem') { const o = addDays(hoje, -1); return [o, o]; }
    if (periodo === 'mes') return monthRange(monthKeyOffset(0));
    if (periodo === 'mes_passado') return monthRange(monthKeyOffset(-1));
    return [de <= ate ? de : ate, de <= ate ? ate : de];
  }, [periodo, de, ate]);

  const doPeriodoTodos = useMemo(() => caixa.filter((c) => inRange(c.data, ini, fim)), [caixa, ini, fim]);
  const doPeriodo = useMemo(() => doPeriodoTodos.filter((c) => !c.excluido_em), [doPeriodoTodos]);
  const excluidosPeriodo = doPeriodoTodos.length - doPeriodo.length;
  const totais = useMemo(() => calcularTotais(doPeriodo), [doPeriodo]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = filtro === 'excluidos' ? doPeriodoTodos.filter((c) => c.excluido_em) : doPeriodo;
    return base
      .filter((c) => filtro === 'todos' || filtro === 'excluidos' || c.tipo === filtro)
      .filter((c) => !q || c.descricao.toLowerCase().includes(q))
      .sort((a, b) => (a.data === b.data ? ((a.created_at || '') < (b.created_at || '') ? 1 : -1) : a.data < b.data ? 1 : -1));
  }, [doPeriodo, doPeriodoTodos, filtro, busca]);

  const formaLabel = (id?: string | null) => formasPagamento.find((f) => f.id === id)?.label || (id === 'boleto' ? 'Boleto/transferência' : id) || '—';

  const abrirNovo = (tipo: 'entrada' | 'saida') => { setForm(formVazio(tipo)); setOpen(true); };
  const abrirEdicao = (c: CaixaItem) => {
    if (!isDono || c.excluido_em) return;
    if (c.conta_id) { toast('Este lançamento vem de uma conta paga. Altere pela aba Contas a pagar.', 'erro'); return; }
    setForm({
      id: c.id, data: c.data, descricao: c.descricao, valor: String(c.valor).replace('.', ','), tipo: c.tipo,
      canal: c.canal || 'balcao', forma_pagamento: c.forma_pagamento || (c.tipo === 'entrada' ? 'pix' : 'dinheiro'), categoria: c.categoria || 'outro',
    });
    setOpen(true);
  };

  const salvar = async (continuar: boolean) => {
    const valor = parseValor(form.valor);
    if (!form.descricao.trim()) return toast('Informe uma descrição.', 'erro');
    if (!(valor > 0)) return toast('Informe um valor maior que zero.', 'erro');

    const original = form.id ? caixa.find((c) => c.id === form.id) : undefined;
    const mesmaForma = original && original.tipo === 'entrada' && original.forma_pagamento === form.forma_pagamento;
    const taxa = form.tipo === 'entrada'
      ? (mesmaForma ? Number(original?.taxa || 0) : Number(formasPagamento.find((f) => f.id === form.forma_pagamento)?.taxa || 0))
      : 0;

    const registro = {
      data: form.data,
      descricao: form.descricao.trim(),
      valor,
      tipo: form.tipo,
      forma_pagamento: form.forma_pagamento,
      taxa,
      canal: form.tipo === 'entrada' ? form.canal : null,
      categoria: form.tipo === 'saida' ? form.categoria : null,
    };

    setSalvando(true);
    const q = form.id
      ? supabase.from('caixa').update(registro).eq('id', form.id).select().single()
      : supabase.from('caixa').insert(registro).select().single();
    const { data, error } = await q;
    setSalvando(false);
    if (error) return toast(traduzErro(error.message), 'erro');

    const salvo = data as CaixaItem;
    setCaixa(form.id ? caixa.map((c) => (c.id === form.id ? salvo : c)) : [salvo, ...caixa]);
    toast(form.id ? 'Lançamento atualizado.' : `${form.tipo === 'entrada' ? 'Venda' : 'Despesa'} de ${formatBRL(valor)} lançada.`);
    if (continuar && !form.id) setForm({ ...form, descricao: '', valor: '' });
    else setOpen(false);
  };

  const remover = (c: CaixaItem) => {
    if (c.conta_id) { toast('Este lançamento vem de uma conta paga. Desfaça o pagamento na aba Contas a pagar.', 'erro'); return; }
    setExcluir({ item: c, motivo: '' });
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    if (!excluir.motivo.trim()) return toast('Informe o motivo da exclusão.', 'erro');
    setSalvando(true);
    const { error } = await supabase.rpc('excluir_lancamento', { p_id: excluir.item.id, p_motivo: excluir.motivo.trim() });
    setSalvando(false);
    if (error) return toast(traduzErro(error.message), 'erro');
    const agora = new Date().toISOString();
    setCaixa(caixa.map((x) => (x.id === excluir.item.id ? { ...x, excluido_em: agora, motivo_exclusao: excluir.motivo.trim() } : x)));
    setExcluir(null);
    setOpen(false);
    toast('Lançamento excluído. Ele continua no histórico de excluídos.');
  };

  const salvarTaxas = async () => {
    const mudancas = Object.entries(taxasEdit)
      .map(([id, v]) => ({ id, taxa: parseValor(v) }))
      .filter((m) => !Number.isNaN(m.taxa) && m.taxa >= 0 && m.taxa <= 100);
    for (const m of mudancas) {
      const { error } = await supabase.from('formas_pagamento').update({ taxa: m.taxa }).eq('id', m.id);
      if (error) return toast(traduzErro(error.message), 'erro');
    }
    setFormasPagamento(formasPagamento.map((f) => {
      const m = mudancas.find((x) => x.id === f.id);
      return m ? { ...f, taxa: m.taxa } : f;
    }));
    setTaxasEdit({});
    setOpenTaxas(false);
    toast('Taxas atualizadas. Valem para os próximos lançamentos.');
  };

  const tituloPeriodo = ini === fim ? formatDatePt(ini) : `${formatDatePt(ini)} a ${formatDatePt(fim)}`;

  return (
    <div>
      <PageHeader title="Caixa" subtitle="Lance vendas e despesas do dia a dia.">
        {isDono && <GhostBtn onClick={() => { setTaxasEdit({}); setOpenTaxas(true); }}><Settings size={15} /> Taxas</GhostBtn>}
        <button onClick={() => abrirNovo('saida')} className="pressionar flex items-center gap-1.5 bg-white text-erro border border-erro/40 px-3.5 min-h-[44px] md:min-h-[40px] rounded-xl text-sm font-semibold cursor-pointer hover:bg-erro-bg">
          <ArrowUpCircle size={16} /> Despesa
        </button>
        <PrimaryBtn onClick={() => abrirNovo('entrada')}>Venda</PrimaryBtn>
      </PageHeader>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <Segmented<Periodo> value={periodo} onChange={setPeriodo} options={isDono ? [
          { id: 'hoje', label: 'Hoje' }, { id: 'ontem', label: 'Ontem' }, { id: 'mes', label: 'Este mês' },
          { id: 'mes_passado', label: 'Mês passado' }, { id: 'custom', label: 'Período' },
        ] : [{ id: 'hoje', label: 'Hoje' }, { id: 'ontem', label: 'Ontem' }]} />
        {periodo === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className={`${inputClass} md:w-[150px]`} value={de} onChange={(e) => setDe(e.target.value)} />
            <span className="text-sm text-pimenta-3">até</span>
            <input type="date" className={`${inputClass} md:w-[150px]`} value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Vendas (bruto)" value={formatBRL(totais.bruto)} hint={`${totais.vendas} venda${totais.vendas === 1 ? '' : 's'}`} color="#56743F" small />
        <Stat label="Taxas" value={`− ${formatBRL(totais.taxas)}`} hint="maquininha / apps" color="#8A5A00" small />
        <Stat label="Despesas" value={`− ${formatBRL(totais.despesas)}`} color="#B3261E" small />
        <Stat label="Saldo do período" value={formatBRL(totais.saldo)} hint={tituloPeriodo} color={totais.saldo >= 0 ? '#56743F' : '#B3261E'} small destaque />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-3 md:items-center">
        <Segmented<Filtro> value={filtro} onChange={setFiltro} options={[
          { id: 'todos', label: 'Todos' }, { id: 'entrada', label: 'Vendas' }, { id: 'saida', label: 'Despesas' },
          ...(isDono && excluidosPeriodo > 0 ? [{ id: 'excluidos' as Filtro, label: `Excluídos (${excluidosPeriodo})` }] : []),
        ]} />
        <div className="relative md:w-[280px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pimenta-3" />
          <input type="search" enterKeyHint="search" aria-label="Buscar lançamento" className={`${inputClass} pl-9`} placeholder="Buscar descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      {lista.length === 0 ? (
        <TableWrap>
          {doPeriodo.length ? (
            <EmptyState icon={Search} title="Nada encontrado" text="Nenhum lançamento combina com a busca ou o filtro escolhido.">
              <GhostBtn onClick={() => { setBusca(''); setFiltro('todos'); }}>Limpar busca e filtro</GhostBtn>
            </EmptyState>
          ) : (
            <EmptyState icon={Wallet}
              title={periodo === 'hoje' ? 'Nenhuma venda lançada hoje' : 'Nenhum lançamento neste período'}
              text={periodo === 'hoje'
                ? 'Toque em Venda a cada pedido. Leva poucos segundos, e o resumo e o fechamento do dia se montam sozinhos.'
                : 'Escolha outro período acima ou lance uma venda agora.'}>
              <PrimaryBtn onClick={() => abrirNovo('entrada')}>Lançar venda</PrimaryBtn>
            </EmptyState>
          )}
        </TableWrap>
      ) : (
        <>
          {/* Celular: cartões */}
          <div className="md:hidden flex flex-col gap-2">
            {lista.map((c) => (
              <button type="button" key={c.id} onClick={() => abrirEdicao(c)} disabled={!isDono || !!c.excluido_em}
                className="pressionar w-full text-left font-sans text-pimenta bg-white border border-borda rounded-xl p-3 min-h-[60px] flex items-center gap-3 cursor-pointer disabled:cursor-default">
                {c.tipo === 'entrada' ? <ArrowDownCircle size={22} className="text-louro shrink-0" /> : <ArrowUpCircle size={22} className="text-erro shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm truncate ${c.excluido_em ? 'line-through text-pimenta-3' : ''}`}>{c.descricao}</div>
                  {c.excluido_em && <div className="text-[12px] text-erro">Excluído: {c.motivo_exclusao}</div>}
                  <div className="text-[12px] text-pimenta-3">
                    {formatDatePt(c.data)} · {c.tipo === 'entrada' ? `${labelOf(CANAIS_VENDA, c.canal)} · ${formaLabel(c.forma_pagamento)}` : labelOf(CATEGORIAS_DESPESA, c.categoria)}
                  </div>
                </div>
                <div className="tabular-nums font-semibold text-sm whitespace-nowrap" style={{ color: c.tipo === 'entrada' ? '#56743F' : '#B3261E' }}>
                  {c.tipo === 'entrada' ? '+' : '−'} {formatBRL(c.valor)}
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden md:block">
            <TableWrap>
              <table className="w-full border-collapse">
                <thead>
                  <tr><Th>Data</Th><Th>Descrição</Th><Th>Canal / Categoria</Th><Th>Pagamento</Th><Th right>Bruto</Th><Th right>Líquido</Th><Th></Th></tr>
                </thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.id} className="hover:bg-pele/50">
                      <Td className="tabular-nums text-pimenta-3 whitespace-nowrap">{formatDatePt(c.data)}</Td>
                      <Td>
                        <div className={c.excluido_em ? 'line-through text-pimenta-3' : ''}>{c.descricao}</div>
                        {c.conta_id && <div className="text-[11.5px] text-pimenta-3 flex items-center gap-1 mt-0.5"><Receipt size={11} /> gerado pela conta paga</div>}
                        {c.excluido_em && (
                          <div className="text-[12px] text-erro flex items-center gap-1 mt-0.5">
                            <Ban size={11} /> Excluído em {new Date(c.excluido_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}: {c.motivo_exclusao}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: c.tipo === 'entrada' ? '#E6EEDD' : '#FBE0DA', color: c.tipo === 'entrada' ? '#56743F' : '#B3261E' }}>
                          {c.tipo === 'entrada' ? labelOf(CANAIS_VENDA, c.canal) : labelOf(CATEGORIAS_DESPESA, c.categoria)}
                        </span>
                      </Td>
                      <Td className="text-pimenta-3 text-[13px] whitespace-nowrap">
                        {formaLabel(c.forma_pagamento)}{c.tipo === 'entrada' && Number(c.taxa) > 0 ? ` (${String(c.taxa).replace(".", ",")}%)` : ''}
                      </Td>
                      <Td className="tabular-nums text-right whitespace-nowrap text-pimenta-3">{formatBRL(c.valor)}</Td>
                      <Td className="tabular-nums font-semibold text-right whitespace-nowrap" style={{ color: c.tipo === 'entrada' ? '#56743F' : '#B3261E' }}>
                        {c.tipo === 'entrada' ? '+' : '−'} {formatBRL(valorLiquido(c))}
                      </Td>
                      <Td>
                        {isDono && !c.excluido_em && !c.conta_id && (
                          <div className="flex justify-end">
                            <IconBtn onClick={() => abrirEdicao(c)} title="Editar"><Pencil size={15} /></IconBtn>
                            <IconBtn onClick={() => remover(c)} color="#B3261E" title="Excluir"><Trash2 size={15} /></IconBtn>
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        </>
      )}

      {open && (
        <Modal title={form.id ? 'Editar lançamento' : form.tipo === 'entrada' ? 'Nova venda' : 'Nova despesa'} onClose={() => setOpen(false)}>
          <div className="flex gap-2">
            {(['entrada', 'saida'] as const).map((t) => (
              <button key={t} onClick={() => setForm({ ...form, tipo: t, forma_pagamento: t === 'saida' && !form.id ? 'dinheiro' : form.forma_pagamento })}
                className="pressionar flex-1 min-h-[44px] md:min-h-[40px] rounded-lg cursor-pointer font-semibold text-[13.5px]"
                style={{
                  border: `1px solid ${form.tipo === t ? '#C2410C' : '#EAD5C7'}`,
                  background: form.tipo === t ? '#C2410C' : '#FFFFFF',
                  color: form.tipo === t ? '#FFFFFF' : '#3A2318',
                }}>
                {t === 'entrada' ? 'Venda (entrada)' : 'Despesa (saída)'}
              </button>
            ))}
          </div>

          <FieldLabel>Valor (R$)</FieldLabel>
          <MoneyInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} autoFocus />

          <FieldLabel>Descrição</FieldLabel>
          <input className={inputClass} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder={form.tipo === 'entrada' ? 'Ex: Mesa 4, Pedido iFood #123' : 'Ex: Compra de carnes'} />

          {form.tipo === 'entrada' ? (
            <>
              <FieldLabel>Canal de venda</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {CANAIS_VENDA.map((k) => (
                  <Chip key={k.id} active={form.canal === k.id} onClick={() => setForm({ ...form, canal: k.id })}>{k.label}</Chip>
                ))}
              </div>
            </>
          ) : (
            <>
              <FieldLabel>Categoria</FieldLabel>
              <select className={inputClass} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS_DESPESA.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </>
          )}

          <FieldLabel>{form.tipo === 'entrada' ? 'Forma de pagamento' : 'Pago com'}</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {formasPagamento.map((k) => (
              <Chip key={k.id} active={form.forma_pagamento === k.id} onClick={() => setForm({ ...form, forma_pagamento: k.id })}>
                {k.label}{form.tipo === 'entrada' && Number(k.taxa) > 0 ? <span className="opacity-70 font-normal"> · {String(k.taxa).replace(".", ",")}%</span> : null}
              </Chip>
            ))}
          </div>
          {form.tipo === 'saida' && form.forma_pagamento === 'dinheiro' && (
            <p className="text-[12px] text-pimenta-3 mt-1.5 mb-0">Despesas em dinheiro são descontadas da gaveta no fechamento de caixa.</p>
          )}

          <FieldLabel>Data</FieldLabel>
          <input className={inputClass} type="date" value={form.data} min={isDono ? undefined : addDays(todayISO(), -1)} max={isDono ? undefined : todayISO()} onChange={(e) => setForm({ ...form, data: e.target.value })} />

          <div className="mt-5 flex flex-col md:flex-row gap-2">
            <PrimaryBtn onClick={() => salvar(false)} disabled={salvando} icon={false} full>{salvando ? 'Salvando...' : 'Salvar'}</PrimaryBtn>
            {!form.id && (
              <button onClick={() => salvar(true)} disabled={salvando}
                className="pressionar w-full bg-white text-pimenta border border-urucum px-4 min-h-[44px] md:min-h-[40px] rounded-xl text-sm font-semibold cursor-pointer hover:bg-urucum-bg disabled:opacity-60">
                Salvar e lançar outra
              </button>
            )}
          </div>
          {form.id && (
            <button
              onClick={() => { const c = caixa.find((x) => x.id === form.id); if (c) { setOpen(false); remover(c); } }}
              className="pressionar mt-2 w-full min-h-[44px] flex items-center justify-center gap-1.5 bg-transparent border-none text-erro text-[13px] font-semibold cursor-pointer rounded-xl hover:bg-erro-bg"
            >
              <Trash2 size={14} /> Excluir lançamento
            </button>
          )}
        </Modal>
      )}

      {excluir && (
        <Modal title="Excluir lançamento" onClose={() => setExcluir(null)}>
          <p className="text-[14px] text-pimenta-2 mt-0">
            <b>{excluir.item.descricao}</b> · {formatBRL(excluir.item.valor)} · {formatDatePt(excluir.item.data)}
          </p>
          <p className="text-[13px] text-pimenta-3">O lançamento sai das contas, mas fica guardado no histórico de excluídos com o motivo.</p>
          <FieldLabel>Motivo</FieldLabel>
          <input className={inputClass} autoFocus value={excluir.motivo} onChange={(e) => setExcluir({ ...excluir, motivo: e.target.value })} placeholder="Ex: lançado em dobro, valor errado" />
          <button onClick={confirmarExclusao} disabled={salvando}
            className="pressionar mt-5 w-full bg-erro text-white border-none px-4 min-h-[44px] rounded-xl text-sm font-semibold cursor-pointer hover:bg-[#962019] disabled:opacity-60">
            {salvando ? 'Excluindo...' : 'Excluir lançamento'}
          </button>
        </Modal>
      )}

      {openTaxas && (
        <Modal title="Taxas por forma de pagamento" onClose={() => setOpenTaxas(false)}>
          <p className="text-[13px] text-pimenta-3 mt-0">Percentual descontado por cada forma de pagamento (maquininha, iFood etc.). A mudança vale para os próximos lançamentos.</p>
          {formasPagamento.map((f) => (
            <div key={f.id} className="flex items-center justify-between mb-2.5">
              <span className="text-sm">{f.label}</span>
              <div className="flex items-center gap-1.5">
                <input
                  inputMode="decimal"
                  aria-label={`Taxa de ${f.label} em %`}
                  className="w-[84px] px-2 py-2 md:py-1.5 rounded-lg border border-borda text-[16px] md:text-sm bg-white tabular-nums text-right focus:outline-none focus:border-urucum focus:ring-1 focus:ring-urucum"
                  value={taxasEdit[f.id] ?? String(f.taxa).replace('.', ',')}
                  onChange={(e) => setTaxasEdit({ ...taxasEdit, [f.id]: e.target.value.replace(/[^\d.,]/g, '') })}
                />
                <span className="text-[13px] text-pimenta-3">%</span>
              </div>
            </div>
          ))}
          <div className="mt-4"><PrimaryBtn onClick={salvarTaxas} icon={false} full>Salvar taxas</PrimaryBtn></div>
        </Modal>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      aria-pressed={active}
      className={`pressionar min-h-[44px] md:min-h-[38px] px-2 rounded-lg text-[13px] font-semibold cursor-pointer border ${active ? 'bg-urucum text-white border-urucum' : 'bg-white text-pimenta border-borda hover:border-urucum'}`}>
      {children}
    </button>
  );
}
