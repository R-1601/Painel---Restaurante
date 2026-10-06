import { useMemo } from 'react';
import { Clock, AlertTriangle, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import {
  type CaixaItem, type ContaItem, type EstoqueItem, CANAIS_VENDA, formatBRL, formatDatePt, todayISO, addDays, monthKeyOffset, monthRange,
  calcularTotais, inRange, pctVariacao, formatMonthPt, situacaoConta,
} from '../types';
import { Stat, Card, Badge } from './ui';

interface ResumoTabProps {
  caixa: CaixaItem[];
  contas: ContaItem[];
  estoque: EstoqueItem[];
  onNavigate: (tab: string) => void;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between text-sm py-1 gap-3 ${bold ? 'font-bold' : 'font-normal'}`}>
      <span className="text-[#5A5344]">{label}</span>
      <span style={{ color: color || '#20291F' }}>{value}</span>
    </div>
  );
}

function Var({ p }: { p: number | null }) {
  if (p === null) return <span>sem comparação</span>;
  const Icon = p >= 0 ? TrendingUp : TrendingDown;
  return <span className="inline-flex items-center gap-1 font-semibold" style={{ color: p >= 0 ? '#2F6F62' : '#B33A3A' }}><Icon size={13} />{p >= 0 ? '+' : ''}{p.toFixed(0)}%</span>;
}

export default function ResumoTab({ caixa, contas, estoque, onNavigate }: ResumoTabProps) {
  const hoje = todayISO();
  const mesKey = monthKeyOffset(0);
  const [iniMes] = monthRange(mesKey);
  const diaDoMes = Number(hoje.slice(8));
  const [iniAnt, fimAntCheio] = monthRange(monthKeyOffset(-1));
  // Mês anterior até o mesmo dia, para comparar de forma justa
  const fimAntParcial = addDays(iniAnt, diaDoMes - 1) > fimAntCheio ? fimAntCheio : addDays(iniAnt, diaDoMes - 1);

  const tHoje = useMemo(() => calcularTotais(caixa.filter((c) => c.data === hoje)), [caixa, hoje]);
  const tSemanaPassada = useMemo(() => calcularTotais(caixa.filter((c) => c.data === addDays(hoje, -7))), [caixa, hoje]);
  const tMes = useMemo(() => calcularTotais(caixa.filter((c) => inRange(c.data, iniMes, hoje))), [caixa, iniMes, hoje]);
  const tAntParcial = useMemo(() => calcularTotais(caixa.filter((c) => inRange(c.data, iniAnt, fimAntParcial))), [caixa, iniAnt, fimAntParcial]);

  const porCanal = useMemo(() => {
    const map: Record<string, number> = {};
    caixa.filter((c) => c.tipo === 'entrada' && inRange(c.data, iniMes, hoje)).forEach((e) => {
      const k = e.canal || 'outro';
      map[k] = (map[k] || 0) + Number(e.valor);
    });
    return map;
  }, [caixa, iniMes, hoje]);

  const contasAlerta = contas
    .filter((c) => c.status !== 'pago' && c.vencimento <= addDays(hoje, 7))
    .sort((a, b) => (a.vencimento > b.vencimento ? 1 : -1));
  const totalPendente = contas.filter((c) => c.status !== 'pago').reduce((s, c) => s + Number(c.valor), 0);
  const estoqueBaixo = estoque.filter((i) => Number(i.qtd) <= Number(i.minimo));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-[24px] md:text-[28px] font-bold text-green-dark leading-tight m-0">Resumo</h1>
        <p className="text-[14px] text-[#6B6355] mt-1 mb-0">{formatMonthPt(mesKey)} · hoje é {formatDatePt(hoje)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Vendas hoje" value={formatBRL(tHoje.bruto)} color="#2F6F62" hint={<><Var p={pctVariacao(tHoje.bruto, tSemanaPassada.bruto)} /> vs. mesmo dia semana passada</>} />
        <Stat label="Vendas no mês" value={formatBRL(tMes.bruto)} hint={<><Var p={pctVariacao(tMes.bruto, tAntParcial.bruto)} /> vs. mês passado (até dia {diaDoMes})</>} />
        <Stat label="Lucro no mês" value={formatBRL(tMes.saldo)} color={tMes.saldo >= 0 ? '#2F6F62' : '#B33A3A'} hint="vendas − taxas − despesas" />
        <Stat label="Ticket médio" value={formatBRL(tMes.ticketMedio)} hint={`${tMes.vendas} vendas no mês`} />
      </div>

      <div className="flex gap-5 flex-col lg:flex-row mb-6">
        <div className="bg-white border border-dashed border-card-border rounded p-6 md:px-8 lg:w-[360px] font-mono shadow-sm shrink-0">
          <div className="text-center text-xs tracking-widest text-[#8A8270] mb-4 uppercase">— Fechamento parcial do mês —</div>
          <Row label="Vendas (bruto)" value={formatBRL(tMes.bruto)} color="#2F6F62" />
          <Row label="Taxas de pagamento" value={`− ${formatBRL(tMes.taxas)}`} color="#8A6D1E" />
          <Row label="Vendas (líquido)" value={formatBRL(tMes.liquido)} color="#2F6F62" bold />
          <Row label="Despesas" value={`− ${formatBRL(tMes.despesas)}`} color="#B33A3A" />
          <div className="border-t border-dashed border-card-border my-3" />
          <Row label="Saldo" value={formatBRL(tMes.saldo)} bold color={tMes.saldo >= 0 ? '#2F6F62' : '#B33A3A'} />
          <div className="border-t border-dashed border-card-border my-3" />
          <Row label={`Mês passado até dia ${diaDoMes}`} value={formatBRL(tAntParcial.saldo)} />
          <Row label="Contas em aberto" value={formatBRL(totalPendente)} color="#8A6D1E" />
        </div>

        <Card className="p-5 flex-1 min-w-0">
          <div className="flex justify-between items-center mb-3.5">
            <div className="font-semibold text-[15px]">Vendas por canal no mês</div>
            <button onClick={() => onNavigate('relatorios')} className="text-[12.5px] font-semibold text-teal bg-transparent border-none cursor-pointer flex items-center gap-1">Relatórios <ArrowRight size={13} /></button>
          </div>
          {CANAIS_VENDA.map((c) => {
            const valor = porCanal[c.id] || 0;
            const pct = tMes.bruto > 0 ? Math.round((valor / tMes.bruto) * 100) : 0;
            return (
              <div key={c.id} className="mb-3">
                <div className="flex justify-between text-[13.5px] mb-1">
                  <span className="text-[#5A5344]">{c.label}</span>
                  <span className="font-mono">{formatBRL(valor)} <span className="text-[#8A8270]">({pct}%)</span></span>
                </div>
                <div className="bg-paper-line h-2 rounded-full overflow-hidden">
                  <div className="bg-teal h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2"><Clock size={17} className="text-gold" /><span className="font-semibold text-[15px]">Contas vencidas e da semana</span></div>
            <button onClick={() => onNavigate('contas')} className="text-[12.5px] font-semibold text-teal bg-transparent border-none cursor-pointer flex items-center gap-1">Ver <ArrowRight size={13} /></button>
          </div>
          {contasAlerta.length === 0 ? <p className="text-[13.5px] text-[#8A8270] m-0">Nada vencendo nos próximos 7 dias.</p> : (
            <div className="flex flex-col gap-2">
              {contasAlerta.slice(0, 6).map((c) => {
                const s = situacaoConta(c, hoje);
                return (
                  <div key={c.id} className="flex justify-between items-center gap-2 text-[13.5px]">
                    <span className="truncate">{c.nome} <span className="font-mono text-[#8A8270]">{formatBRL(c.valor)}</span></span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2"><AlertTriangle size={17} className="text-red" /><span className="font-semibold text-[15px]">Estoque baixo</span></div>
            <button onClick={() => onNavigate('estoque')} className="text-[12.5px] font-semibold text-teal bg-transparent border-none cursor-pointer flex items-center gap-1">Ver <ArrowRight size={13} /></button>
          </div>
          {estoqueBaixo.length === 0 ? <p className="text-[13.5px] text-[#8A8270] m-0">Nenhum item abaixo do mínimo.</p> : (
            <ul className="m-0 pl-4 text-[13.5px] text-[#4A4536] leading-[1.9] list-disc">
              {estoqueBaixo.slice(0, 6).map((i) => <li key={i.id}>{i.nome}: {Number(i.qtd).toLocaleString('pt-BR')} {i.unidade} <span className="text-[#8A8270]">(mín. {Number(i.minimo).toLocaleString('pt-BR')})</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
