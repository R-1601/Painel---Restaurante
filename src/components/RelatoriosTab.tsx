import { useMemo, useState } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import {
  type CaixaItem, type FormaPagamento, CANAIS_VENDA, CATEGORIAS_DESPESA, labelOf, todayISO, addDays, formatBRL, formatDatePt,
  monthKeyOffset, monthRange, calcularTotais, inRange, daysBetween, pctVariacao, valorTaxa, formatMonthPt, parseISODate,
} from '../types';
import { PageHeader, Segmented, Stat, Card, GhostBtn, inputClass, TableWrap, Th, Td, EmptyState } from './ui';

type Periodo = '7d' | '30d' | 'mes' | 'mes_passado' | 'custom';

interface Props {
  caixa: CaixaItem[];
  formasPagamento: FormaPagamento[];
}

export default function RelatoriosTab({ caixa, formasPagamento }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [de, setDe] = useState(addDays(todayISO(), -30));
  const [ate, setAte] = useState(todayISO());

  const [ini, fim] = useMemo((): [string, string] => {
    const hoje = todayISO();
    if (periodo === '7d') return [addDays(hoje, -6), hoje];
    if (periodo === '30d') return [addDays(hoje, -29), hoje];
    if (periodo === 'mes') return [monthRange(monthKeyOffset(0))[0], hoje];
    if (periodo === 'mes_passado') return monthRange(monthKeyOffset(-1));
    return de <= ate ? [de, ate] : [ate, de];
  }, [periodo, de, ate]);

  // Período anterior de mesmo tamanho, para comparação
  const dias = daysBetween(ini, fim) + 1;
  const [iniAnt, fimAnt] = periodo === 'mes'
    ? [monthRange(monthKeyOffset(-1))[0], addDays(monthRange(monthKeyOffset(-1))[0], dias - 1)]
    : periodo === 'mes_passado'
      ? monthRange(monthKeyOffset(-2))
      : [addDays(ini, -dias), addDays(ini, -1)];

  const itens = useMemo(() => caixa.filter((c) => inRange(c.data, ini, fim)), [caixa, ini, fim]);
  const itensAnt = useMemo(() => caixa.filter((c) => inRange(c.data, iniAnt, fimAnt)), [caixa, iniAnt, fimAnt]);
  const t = useMemo(() => calcularTotais(itens), [itens]);
  const tAnt = useMemo(() => calcularTotais(itensAnt), [itensAnt]);

  const porDia = useMemo(() => {
    const out: { data: string; vendas: number; despesas: number }[] = [];
    for (let i = 0; i < dias && i < 400; i++) out.push({ data: addDays(ini, i), vendas: 0, despesas: 0 });
    const idx = new Map(out.map((d, i) => [d.data, i]));
    for (const c of itens) {
      const i = idx.get(c.data);
      if (i === undefined) continue;
      if (c.tipo === 'entrada') out[i].vendas += Number(c.valor);
      else out[i].despesas += Number(c.valor);
    }
    return out;
  }, [itens, ini, dias]);

  const agrupar = (lista: CaixaItem[], chave: (c: CaixaItem) => string) => {
    const m = new Map<string, number>();
    for (const c of lista) m.set(chave(c), (m.get(chave(c)) || 0) + Number(c.valor));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const entradas = itens.filter((c) => c.tipo === 'entrada');
  const saidas = itens.filter((c) => c.tipo === 'saida');
  const porCanal = agrupar(entradas, (c) => labelOf(CANAIS_VENDA, c.canal));
  const porForma = agrupar(entradas, (c) => formasPagamento.find((f) => f.id === c.forma_pagamento)?.label || c.forma_pagamento || '—');
  const porCategoria = agrupar(saidas, (c) => labelOf(CATEGORIAS_DESPESA, c.categoria));
  const taxasPorForma = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of entradas) {
      const k = formasPagamento.find((f) => f.id === c.forma_pagamento)?.label || c.forma_pagamento || '—';
      m.set(k, (m.get(k) || 0) + valorTaxa(c));
    }
    return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [entradas, formasPagamento]);

  const melhorDia = porDia.reduce<{ data: string; vendas: number } | null>((best, d) => (d.vendas > (best?.vendas || 0) ? d : best), null);
  const diasSemana = useMemo(() => {
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const soma = Array(7).fill(0), cont = Array(7).fill(0);
    for (const d of porDia) { const w = parseISODate(d.data).getDay(); soma[w] += d.vendas; cont[w]++; }
    return nomes.map((n, i) => [n, cont[i] ? soma[i] / cont[i] : -1] as [string, number]).filter(([, v]) => v >= 0);
  }, [porDia]);

  const meses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const key = monthKeyOffset(i - 5);
      const [a, b] = monthRange(key);
      return { key, ...calcularTotais(caixa.filter((c) => inRange(c.data, a, b))) };
    });
  }, [caixa]);

  const exportarCSV = () => {
    const linhas = [['Data', 'Tipo', 'Descrição', 'Canal', 'Categoria', 'Forma de pagamento', 'Valor bruto', 'Taxa %', 'Valor taxa', 'Valor líquido']];
    for (const c of [...itens].sort((a, b) => (a.data < b.data ? -1 : 1))) {
      const taxa = valorTaxa(c);
      linhas.push([
        formatDatePt(c.data), c.tipo === 'entrada' ? 'Venda' : 'Despesa', c.descricao,
        c.tipo === 'entrada' ? labelOf(CANAIS_VENDA, c.canal) : '', c.tipo === 'saida' ? labelOf(CATEGORIAS_DESPESA, c.categoria) : '',
        formasPagamento.find((f) => f.id === c.forma_pagamento)?.label || c.forma_pagamento || '',
        num(c.valor), num(c.taxa || 0), num(taxa), num(c.tipo === 'entrada' ? Number(c.valor) - taxa : Number(c.valor)),
      ]);
    }
    const csv = '﻿' + linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `caixa_${ini}_a_${fim}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Relatórios" subtitle={`${formatDatePt(ini)} a ${formatDatePt(fim)} · comparado com ${formatDatePt(iniAnt)} a ${formatDatePt(fimAnt)}`}>
        <GhostBtn onClick={exportarCSV} disabled={!itens.length}><Download size={15} /> Exportar planilha</GhostBtn>
      </PageHeader>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <Segmented<Periodo> value={periodo} onChange={setPeriodo} options={[
          { id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }, { id: 'mes', label: 'Este mês' },
          { id: 'mes_passado', label: 'Mês passado' }, { id: 'custom', label: 'Período' },
        ]} />
        {periodo === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className={`${inputClass} md:w-[150px]`} value={de} onChange={(e) => setDe(e.target.value)} />
            <span className="text-sm text-[#8A8270]">até</span>
            <input type="date" className={`${inputClass} md:w-[150px]`} value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Vendas (bruto)" value={formatBRL(t.bruto)} hint={<Var atual={t.bruto} anterior={tAnt.bruto} />} />
        <Stat label="Despesas" value={formatBRL(t.despesas)} hint={<Var atual={t.despesas} anterior={tAnt.despesas} inverso />} />
        <Stat label="Lucro (após taxas)" value={formatBRL(t.saldo)} color={t.saldo >= 0 ? '#2F6F62' : '#B33A3A'} hint={<Var atual={t.saldo} anterior={tAnt.saldo} />} />
        <Stat label="Ticket médio" value={formatBRL(t.ticketMedio)} hint={<>{t.vendas} vendas · <Var atual={t.ticketMedio} anterior={tAnt.ticketMedio} /></>} />
      </div>

      {itens.length === 0 ? (
        <TableWrap><EmptyState text="Sem lançamentos neste período." /></TableWrap>
      ) : (
        <>
          <Card className="p-5 mb-5">
            <div className="flex flex-wrap justify-between gap-2 mb-1">
              <div className="font-semibold text-[15px]">Vendas por dia</div>
              {melhorDia && <div className="text-[12.5px] text-[#8A8270]">Melhor dia: <b className="text-ink">{formatDatePt(melhorDia.data)}</b> · {formatBRL(melhorDia.vendas)}</div>}
            </div>
            <div className="text-[12.5px] text-[#8A8270] mb-3">Média de {formatBRL(t.bruto / Math.max(1, dias))} por dia</div>
            <BarrasDia dados={porDia} />
          </Card>

          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <Ranking titulo="Vendas por canal" itens={porCanal} total={t.bruto} />
            <Ranking titulo="Vendas por forma de pagamento" itens={porForma} total={t.bruto} />
            <Ranking titulo="Despesas por categoria" itens={porCategoria} total={t.despesas} cor="#B33A3A" vazio="Nenhuma despesa no período." />
            <Ranking titulo="Média de vendas por dia da semana" itens={diasSemana} total={Math.max(...diasSemana.map((d) => d[1]))} semPct />
          </div>

          {taxasPorForma.length > 0 && (
            <Card className="p-5 mb-5">
              <div className="font-semibold text-[15px] mb-1">Quanto você pagou de taxas</div>
              <div className="text-[13px] text-[#8A8270] mb-3">Total de {formatBRL(t.taxas)} ({t.bruto ? ((t.taxas / t.bruto) * 100).toFixed(1).replace('.', ',') : 0}% do faturamento)</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                {taxasPorForma.map(([k, v]) => <div key={k} className="text-sm"><span className="text-[#5A5344]">{k}:</span> <span className="font-mono font-semibold">{formatBRL(v)}</span></div>)}
              </div>
            </Card>
          )}
        </>
      )}

      <h3 className="font-serif text-[18px] font-bold text-green-dark mb-3">Últimos 6 meses</h3>
      <TableWrap>
        <table className="w-full border-collapse">
          <thead><tr><Th>Mês</Th><Th right>Vendas</Th><Th right>Taxas</Th><Th right>Despesas</Th><Th right>Lucro</Th><Th right>Ticket médio</Th></tr></thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.key}>
                <Td className="whitespace-nowrap font-semibold">{formatMonthPt(m.key)}</Td>
                <Td className="font-mono text-right">{formatBRL(m.bruto)}</Td>
                <Td className="font-mono text-right text-[#8A8270]">{formatBRL(m.taxas)}</Td>
                <Td className="font-mono text-right">{formatBRL(m.despesas)}</Td>
                <Td className="font-mono text-right font-semibold" style={{ color: m.saldo >= 0 ? '#2F6F62' : '#B33A3A' }}>{formatBRL(m.saldo)}</Td>
                <Td className="font-mono text-right">{formatBRL(m.ticketMedio)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

const num = (v: number) => (Number(v) || 0).toFixed(2).replace('.', ',');

function Var({ atual, anterior, inverso }: { atual: number; anterior: number; inverso?: boolean }) {
  const p = pctVariacao(atual, anterior);
  if (p === null) return <span>sem base de comparação</span>;
  const bom = inverso ? p <= 0 : p >= 0;
  const Icon = p >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 font-semibold" style={{ color: bom ? '#2F6F62' : '#B33A3A' }}>
      <Icon size={13} /> {p >= 0 ? '+' : ''}{p.toFixed(0)}% <span className="font-normal text-[#8A8270]">vs. anterior</span>
    </span>
  );
}

function Ranking({ titulo, itens, total, cor = '#2F6F62', vazio = 'Sem dados.', semPct }: {
  titulo: string; itens: [string, number][]; total: number; cor?: string; vazio?: string; semPct?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="font-semibold text-[15px] mb-3.5">{titulo}</div>
      {itens.length === 0 ? <p className="text-sm text-[#8A8270] m-0">{vazio}</p> : itens.map(([k, v]) => {
        const pct = total > 0 ? (v / total) * 100 : 0;
        return (
          <div key={k} className="mb-3 last:mb-0">
            <div className="flex justify-between text-[13.5px] mb-1 gap-2">
              <span className="text-[#5A5344]">{k}</span>
              <span className="font-mono whitespace-nowrap">{formatBRL(v)}{!semPct && <span className="text-[#8A8270]"> · {pct.toFixed(0)}%</span>}</span>
            </div>
            <div className="bg-paper-line h-2 rounded-full overflow-hidden">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(pct, v > 0 ? 1.5 : 0)}%`, background: cor }} />
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function BarrasDia({ dados }: { dados: { data: string; vendas: number; despesas: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...dados.map((d) => d.vendas));
  const H = 180;
  const n = dados.length;
  const mostrarRotulo = (i: number) => n <= 10 || i === 0 || i === n - 1 || i % Math.ceil(n / 8) === 0;
  const passos = [0, 0.5, 1].map((f) => f * max);

  return (
    <div className="relative">
      <div className="flex">
        <div className="flex flex-col justify-between text-[10.5px] text-[#8A8270] font-mono pr-2 text-right shrink-0 w-[42px]" style={{ height: H }}>
          {[...passos].reverse().map((v, i) => <span key={i}>{abreviar(v)}</span>)}
        </div>
        <div className="flex-1 min-w-0 relative" style={{ height: H }}>
          {passos.map((_, i) => <div key={i} className="absolute left-0 right-0 border-t border-paper-line" style={{ top: `${(i / 2) * 100}%` }} />)}
          <div className="absolute inset-0 flex items-end" style={{ gap: n > 40 ? 1 : 2 }}>
            {dados.map((d, i) => (
              <div key={d.data} className="flex-1 h-full flex items-end justify-center cursor-default"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
                <div className="w-full max-w-[44px] rounded-t-[4px] transition-opacity"
                  style={{ height: `${(d.vendas / max) * 100}%`, minHeight: d.vendas > 0 ? 2 : 0, background: '#2F6F62', opacity: hover === null || hover === i ? 1 : 0.45 }} />
              </div>
            ))}
          </div>
          {hover !== null && (
            <div className="absolute z-10 -top-2 bg-ink text-white text-[12px] px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none whitespace-nowrap"
              style={{ left: `${((hover + 0.5) / n) * 100}%`, transform: `translateX(${hover > n * 0.7 ? '-100%' : hover < n * 0.3 ? '0' : '-50%'})` }}>
              <div className="font-semibold">{formatDatePt(dados[hover].data)} · {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][parseISODate(dados[hover].data).getDay()]}</div>
              <div>Vendas: {formatBRL(dados[hover].vendas)}</div>
              {dados[hover].despesas > 0 && <div className="opacity-80">Despesas: {formatBRL(dados[hover].despesas)}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="flex ml-[42px] mt-1.5 text-[10.5px] text-[#8A8270] font-mono" style={{ gap: n > 40 ? 1 : 2 }}>
        {dados.map((d, i) => <div key={d.data} className="flex-1 text-center overflow-visible whitespace-nowrap">{mostrarRotulo(i) ? d.data.slice(8) + '/' + d.data.slice(5, 7) : ''}</div>)}
      </div>
    </div>
  );
}

function abreviar(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')}k`;
  return v.toFixed(0);
}
