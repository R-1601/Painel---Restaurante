import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Unlock, Printer, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { traduzErro } from '../lib/data';
import { type CaixaItem, type Fechamento, type FormaPagamento, todayISO, addDays, formatBRL, formatDatePt, calcularTotais, valorTaxa } from '../types';
import { PageHeader, Card, Stat, FieldLabel, inputClass, MoneyInput, parseValor, PrimaryBtn, GhostBtn, Badge, Th, Td, TableWrap, EmptyState, useToast } from './ui';

interface Props {
  caixa: CaixaItem[];
  formasPagamento: FormaPagamento[];
  isDono: boolean;
}

export default function FechamentoTab({ caixa, formasPagamento, isDono }: Props) {
  const toast = useToast();
  const [data, setData] = useState(todayISO());
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [troco, setTroco] = useState('');
  const [contado, setContado] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data: rows, error } = await supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false }).limit(60);
    if (error) toast(traduzErro(error.message), 'erro');
    setFechamentos((rows || []) as Fechamento[]);
    setCarregando(false);
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const atual = fechamentos.find((f) => f.data === data) || null;

  useEffect(() => {
    setTroco(atual ? String(atual.troco_inicial).replace('.', ',') : '');
    setContado(atual?.dinheiro_contado != null ? String(atual.dinheiro_contado).replace('.', ',') : '');
    setObs(atual?.observacao || '');
  }, [atual]);

  const doDia = useMemo(() => caixa.filter((c) => c.data === data), [caixa, data]);
  const totais = useMemo(() => calcularTotais(doDia), [doDia]);

  const porForma = useMemo(() => {
    const map = new Map<string, { bruto: number; taxa: number; qtd: number }>();
    for (const c of doDia) {
      if (c.tipo !== 'entrada') continue;
      const k = c.forma_pagamento || 'outro';
      const m = map.get(k) || { bruto: 0, taxa: 0, qtd: 0 };
      m.bruto += Number(c.valor); m.taxa += valorTaxa(c); m.qtd++;
      map.set(k, m);
    }
    return [...map.entries()].sort((a, b) => b[1].bruto - a[1].bruto);
  }, [doDia]);

  const entradasDinheiro = doDia.filter((c) => c.tipo === 'entrada' && c.forma_pagamento === 'dinheiro').reduce((s, c) => s + Number(c.valor), 0);
  const saidasDinheiro = doDia.filter((c) => c.tipo === 'saida' && c.forma_pagamento === 'dinheiro').reduce((s, c) => s + Number(c.valor), 0);
  const trocoNum = parseValor(troco) || 0;
  const esperado = trocoNum + entradasDinheiro - saidasDinheiro;
  const contadoNum = parseValor(contado);
  const diferenca = Number.isNaN(contadoNum) ? null : contadoNum - esperado;
  const fechado = atual?.status === 'fechado';
  const label = (id: string) => formasPagamento.find((f) => f.id === id)?.label || id;

  const abrir = async () => {
    setSalvando(true);
    const { error } = await supabase.from('fechamentos_caixa').upsert(
      { ...(atual ? { id: atual.id } : {}), data, troco_inicial: trocoNum, status: 'aberto' },
      { onConflict: 'restaurante_id,data' },
    );
    setSalvando(false);
    if (error) return toast(traduzErro(error.message), 'erro');
    toast(`Caixa de ${formatDatePt(data)} aberto com ${formatBRL(trocoNum)} de troco.`);
    carregar();
  };

  const fechar = async () => {
    if (Number.isNaN(contadoNum)) return toast('Informe quanto tem de dinheiro na gaveta.', 'erro');
    if (diferenca !== null && Math.abs(diferenca) >= 0.01 && !obs.trim()) {
      if (!window.confirm(`Há uma diferença de ${formatBRL(diferenca)}. Fechar mesmo assim sem observação?`)) return;
    }
    setSalvando(true);
    const registro = {
      data,
      status: 'fechado' as const,
      troco_inicial: trocoNum,
      dinheiro_contado: contadoNum,
      dinheiro_esperado: esperado,
      diferenca: diferenca ?? 0,
      total_vendas: totais.bruto,
      total_despesas: totais.despesas,
      observacao: obs.trim() || null,
      fechado_em: new Date().toISOString(),
    };
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from('fechamentos_caixa').upsert(
      { ...(atual ? { id: atual.id } : {}), ...registro, fechado_por: user.user?.id },
      { onConflict: 'restaurante_id,data' },
    );
    setSalvando(false);
    if (error) return toast(traduzErro(error.message), 'erro');
    toast(`Caixa de ${formatDatePt(data)} fechado.`);
    carregar();
  };

  const reabrir = async () => {
    if (!atual || !window.confirm('Reabrir este caixa? Você poderá corrigir os valores e fechar de novo.')) return;
    const { error } = await supabase.from('fechamentos_caixa').update({ status: 'aberto' }).eq('id', atual.id);
    if (error) return toast(traduzErro(error.message), 'erro');
    carregar();
  };

  const diffTone = diferenca === null ? undefined : Math.abs(diferenca) < 0.01 ? '#2F6F62' : diferenca > 0 ? '#8A6D1E' : '#B33A3A';

  return (
    <div>
      <PageHeader title="Fechamento de caixa" subtitle="Abra o caixa com o troco, confira a gaveta no fim do dia e registre o fechamento.">
        <input type="date" className={`${inputClass} md:w-[160px]`} value={data} max={todayISO()} min={isDono ? undefined : addDays(todayISO(), -1)} onChange={(e) => setData(e.target.value)} />
        {fechado && <GhostBtn onClick={() => window.print()}><Printer size={15} /> Imprimir</GhostBtn>}
      </PageHeader>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-[#5A5344]">Situação de {formatDatePt(data)}:</span>
        {carregando ? <Badge>carregando...</Badge> : fechado ? <Badge tone="green"><Lock size={12} /> Fechado</Badge> : atual ? <Badge tone="gold"><Unlock size={12} /> Aberto</Badge> : <Badge>Não aberto</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Vendas do dia" value={formatBRL(totais.bruto)} hint={`${totais.vendas} vendas · ticket ${formatBRL(totais.ticketMedio)}`} color="#2F6F62" small />
        <Stat label="Taxas" value={`− ${formatBRL(totais.taxas)}`} color="#8A6D1E" small />
        <Stat label="Despesas do dia" value={`− ${formatBRL(totais.despesas)}`} color="#B33A3A" small />
        <Stat label="Resultado do dia" value={formatBRL(totais.saldo)} color={totais.saldo >= 0 ? '#2F6F62' : '#B33A3A'} small />
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6 print:block">
        <Card className="p-5">
          <div className="font-semibold text-[15px] mb-3">Vendas por forma de pagamento</div>
          {porForma.length === 0 ? <p className="text-sm text-[#8A8270] m-0">Nenhuma venda lançada neste dia.</p> : (
            <div className="flex flex-col gap-2">
              {porForma.map(([id, v]) => (
                <div key={id} className="flex justify-between text-sm border-b border-paper-line pb-2 last:border-none">
                  <span>{label(id)} <span className="text-[#8A8270] text-[12px]">({v.qtd})</span></span>
                  <span className="font-mono">{formatBRL(v.bruto)}{v.taxa > 0 && <span className="text-[#8A8270] text-[12px]"> · líq. {formatBRL(v.bruto - v.taxa)}</span>}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 font-mono">
          <div className="font-sans font-semibold text-[15px] mb-3">Conferência do dinheiro na gaveta</div>
          <Linha label="Troco inicial" value={formatBRL(trocoNum)} />
          <Linha label="+ Vendas em dinheiro" value={formatBRL(entradasDinheiro)} color="#2F6F62" />
          <Linha label="− Despesas pagas em dinheiro" value={formatBRL(saidasDinheiro)} color="#B33A3A" />
          <div className="border-t border-dashed border-card-border my-2" />
          <Linha label="= Deveria ter na gaveta" value={formatBRL(esperado)} bold />
          {!Number.isNaN(contadoNum) && (
            <>
              <Linha label="Contado" value={formatBRL(contadoNum)} />
              <Linha label="Diferença" value={`${diferenca! > 0 ? '+' : ''}${formatBRL(diferenca!)}`} color={diffTone} bold />
              <div className="font-sans text-[12.5px] mt-2 flex items-center gap-1.5" style={{ color: diffTone }}>
                {Math.abs(diferenca!) < 0.01 ? <><CheckCircle2 size={14} /> Caixa batendo certinho.</> : <><AlertTriangle size={14} /> {diferenca! > 0 ? 'Sobrando dinheiro.' : 'Faltando dinheiro.'}</>}
              </div>
            </>
          )}
        </Card>
      </div>

      {!fechado && (
        <Card className="p-5 mb-6 print:hidden">
          <div className="grid md:grid-cols-3 gap-x-4">
            <div>
              <FieldLabel>Troco inicial (abertura)</FieldLabel>
              <MoneyInput value={troco} onChange={setTroco} />
            </div>
            <div>
              <FieldLabel>Dinheiro contado na gaveta</FieldLabel>
              <MoneyInput value={contado} onChange={setContado} />
            </div>
            <div>
              <FieldLabel>Observação</FieldLabel>
              <input className={inputClass} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: troco errado mesa 3" />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-5">
            {!atual && <GhostBtn onClick={abrir} disabled={salvando}><Unlock size={15} /> Abrir caixa com este troco</GhostBtn>}
            <PrimaryBtn onClick={fechar} disabled={salvando} icon={false}><Lock size={15} /> {salvando ? 'Salvando...' : 'Fechar caixa do dia'}</PrimaryBtn>
          </div>
        </Card>
      )}

      {fechado && atual && (
        <Card className="p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-sm text-[#5A5344]">
            Fechado em {new Date(atual.fechado_em || '').toLocaleString('pt-BR')}
            {atual.observacao && <> · <i>{atual.observacao}</i></>}
          </div>
          {isDono
            ? <div className="print:hidden"><GhostBtn onClick={reabrir}><Unlock size={15} /> Reabrir</GhostBtn></div>
            : <div className="text-[12.5px] text-[#8A8270]">Só o dono pode reabrir um caixa fechado.</div>}
        </Card>
      )}

      <div className="print:hidden">
        <h3 className="font-serif text-[18px] font-bold text-green-dark mb-3">Últimos fechamentos</h3>
        <TableWrap>
          {fechamentos.length === 0 ? <EmptyState text="Nenhum fechamento registrado ainda." /> : (
            <table className="w-full border-collapse">
              <thead><tr><Th>Data</Th><Th>Situação</Th><Th right>Vendas</Th><Th right>Esperado</Th><Th right>Contado</Th><Th right>Diferença</Th></tr></thead>
              <tbody>
                {fechamentos.map((f) => (
                  <tr key={f.id} className="cursor-pointer hover:bg-[#FCFAF4]" onClick={() => { setData(f.data); window.scrollTo(0, 0); }}>
                    <Td className="font-mono whitespace-nowrap">{formatDatePt(f.data)}</Td>
                    <Td>{f.status === 'fechado' ? <Badge tone="green">Fechado</Badge> : <Badge tone="gold">Aberto</Badge>}</Td>
                    <Td className="font-mono text-right">{f.total_vendas != null ? formatBRL(f.total_vendas) : '—'}</Td>
                    <Td className="font-mono text-right">{f.dinheiro_esperado != null ? formatBRL(f.dinheiro_esperado) : '—'}</Td>
                    <Td className="font-mono text-right">{f.dinheiro_contado != null ? formatBRL(f.dinheiro_contado) : '—'}</Td>
                    <Td className="font-mono text-right font-semibold" style={{ color: f.diferenca == null ? undefined : Math.abs(f.diferenca) < 0.01 ? '#2F6F62' : f.diferenca > 0 ? '#8A6D1E' : '#B33A3A' }}>
                      {f.diferenca != null && f.status === 'fechado' ? formatBRL(f.diferenca) : '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableWrap>
      </div>
    </div>
  );
}

function Linha({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between text-[13.5px] py-1 ${bold ? 'font-bold' : ''}`}>
      <span className="text-[#5A5344] font-sans">{label}</span>
      <span style={{ color: color || '#20291F' }}>{value}</span>
    </div>
  );
}
