import { useMemo } from 'react';
import { Clock, AlertTriangle, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import {
  type CaixaItem, type ContaItem, type EstoqueItem, CANAIS_VENDA, formatBRL, formatDatePt, todayISO, addDays, monthKeyOffset, monthRange,
  calcularTotais, inRange, pctVariacao, formatMonthPt, situacaoConta, porGrupoDespesa,
} from '../types';
import { Stat, Card, Badge, ehZero } from './ui';

interface ResumoTabProps {
  caixa: CaixaItem[];
  contas: ContaItem[];
  estoque: EstoqueItem[];
  onNavigate: (tab: string) => void;
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between text-sm py-1 gap-3 ${bold ? 'font-bold' : 'font-normal'}`}>
      <span className="text-pimenta-2">{label}</span>
      <span style={{ color: ehZero(value) ? '#7E6254' : color || '#3A2318' }}>{value}</span>
    </div>
  );
}

function Var({ p }: { p: number | null }) {
  if (p === null) return <span>sem comparação</span>;
  const Icon = p >= 0 ? TrendingUp : TrendingDown;
  return <span className="inline-flex items-center gap-1 font-semibold" style={{ color: p >= 0 ? '#56743F' : '#B3261E' }}><Icon size={13} />{p >= 0 ? '+' : ''}{p.toFixed(0)}%</span>;
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
  const grupos = useMemo(() => porGrupoDespesa(caixa.filter((c) => inRange(c.data, iniMes, hoje))), [caixa, iniMes, hoje]);
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
        <h1 className="font-display font-normal text-[28px] md:text-[34px] text-pimenta leading-[1.05] m-0">Resumo</h1>
        <p className="text-[14px] text-pimenta-3 mt-1 mb-0">{formatMonthPt(mesKey)}, hoje é {formatDatePt(hoje)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Vendas hoje" value={formatBRL(tHoje.bruto)} color="#56743F" hint={<><Var p={pctVariacao(tHoje.bruto, tSemanaPassada.bruto)} /> vs. mesmo dia semana passada</>} />
        <Stat label="Vendas no mês" value={formatBRL(tMes.bruto)} hint={<><Var p={pctVariacao(tMes.bruto, tAntParcial.bruto)} /> vs. mês passado (até dia {diaDoMes})</>} />
        <Stat label="Lucro no mês" value={formatBRL(tMes.saldo)} color={tMes.saldo >= 0 ? '#56743F' : '#B3261E'} hint="já descontando taxas, custos e contas pagas" destaque />
        <Stat label="Ticket médio" value={formatBRL(tMes.ticketMedio)} hint={`${tMes.vendas} vendas no mês`} />
      </div>

      <div className="flex gap-5 flex-col lg:flex-row lg:items-start mb-6">
        <div className="bg-white rounded-2xl border-t-[5px] border-urucum p-6 md:px-7 lg:w-[360px] tabular-nums shrink-0">
          <div className="font-display text-[21px] text-pimenta mb-3">Resultado do mês</div>
          <Row label="Vendas (bruto)" value={formatBRL(tMes.bruto)} color="#56743F" />
          <Row label="− Taxas (iFood, maquininha)" value={formatBRL(tMes.taxas)} color="#8A5A00" />
          <Row label="= Receita líquida" value={formatBRL(tMes.liquido)} color="#56743F" bold />
          <Row label="− Custo de mercadoria" value={formatBRL(grupos.cmv)} color="#B3261E" />
          <Row label="− Pessoal" value={formatBRL(grupos.pessoal)} color="#B3261E" />
          <Row label="− Despesas fixas" value={formatBRL(grupos.fixas)} color="#B3261E" />
          <Row label="− Outras despesas" value={formatBRL(grupos.outras)} color="#B3261E" />
          <div className="border-t border-linha my-3" />
          <Row label="= Lucro" value={formatBRL(tMes.saldo)} bold color={tMes.saldo >= 0 ? '#56743F' : '#B3261E'} />
          {tMes.liquido > 0 && <Row label="Margem" value={`${((tMes.saldo / tMes.bruto) * 100).toFixed(1).replace('.', ',')}%`} />}
          <div className="border-t border-linha my-3" />
          <Row label={`Lucro mês passado até dia ${diaDoMes}`} value={formatBRL(tAntParcial.saldo)} />
          <Row label="Contas em aberto" value={formatBRL(totalPendente)} color="#8A5A00" />
        </div>

        <Card className="p-5 flex-1 min-w-0">
          <div className="flex justify-between items-center mb-3.5">
            <div className="font-semibold text-[15px]">Vendas por canal no mês</div>
            <button onClick={() => onNavigate('relatorios')} className="pressionar text-[13px] font-semibold text-urucum bg-transparent border-none cursor-pointer flex items-center gap-1 min-h-[36px] px-2 -mr-2 rounded-lg hover:bg-urucum-bg">Relatórios <ArrowRight size={13} /></button>
          </div>
          {tMes.bruto === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[14px] font-semibold text-pimenta m-0">Nenhuma venda no mês ainda</p>
              <p className="text-[13px] text-pimenta-3 mt-1 mb-3">Lance as vendas na aba Caixa e a divisão por canal aparece aqui.</p>
              <button onClick={() => onNavigate('caixa')} className="pressionar min-h-[40px] px-4 rounded-xl bg-urucum text-white text-[13.5px] font-semibold border-none cursor-pointer hover:bg-urucum-dark">Ir para o Caixa</button>
            </div>
          ) : CANAIS_VENDA.map((c) => {
            const valor = porCanal[c.id] || 0;
            const pct = tMes.bruto > 0 ? Math.round((valor / tMes.bruto) * 100) : 0;
            return (
              <div key={c.id} className="mb-3">
                <div className="flex justify-between text-[13.5px] mb-1">
                  <span className="text-pimenta-2">{c.label}</span>
                  <span className="tabular-nums">{formatBRL(valor)} <span className="text-pimenta-3">({pct}%)</span></span>
                </div>
                <div className="bg-pele h-2.5 rounded-full overflow-hidden">
                  <div className="bg-urucum h-2.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2"><Clock size={17} className="text-acafrao-dark" /><span className="font-semibold text-[15px]">Contas vencidas e da semana</span></div>
            <button onClick={() => onNavigate('contas')} className="pressionar text-[13px] font-semibold text-urucum bg-transparent border-none cursor-pointer flex items-center gap-1 min-h-[36px] px-2 -mr-2 rounded-lg hover:bg-urucum-bg">Ver <ArrowRight size={13} /></button>
          </div>
          {contasAlerta.length === 0 ? <p className="text-[13.5px] text-pimenta-3 m-0">Nada vencendo nos próximos 7 dias.</p> : (
            <div className="flex flex-col gap-2">
              {contasAlerta.slice(0, 6).map((c) => {
                const s = situacaoConta(c, hoje);
                return (
                  <div key={c.id} className="flex justify-between items-center gap-2 text-[13.5px]">
                    <span className="truncate">{c.nome} <span className="tabular-nums text-pimenta-3">{formatBRL(c.valor)}</span></span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2"><AlertTriangle size={17} className="text-erro" /><span className="font-semibold text-[15px]">Estoque baixo</span></div>
            <button onClick={() => onNavigate('estoque')} className="pressionar text-[13px] font-semibold text-urucum bg-transparent border-none cursor-pointer flex items-center gap-1 min-h-[36px] px-2 -mr-2 rounded-lg hover:bg-urucum-bg">Ver <ArrowRight size={13} /></button>
          </div>
          {estoqueBaixo.length === 0 ? <p className="text-[13.5px] text-pimenta-3 m-0">Nenhum item abaixo do mínimo.</p> : (
            <ul className="m-0 pl-4 text-[13.5px] text-pimenta-2 leading-[1.9] list-disc">
              {estoqueBaixo.slice(0, 6).map((i) => <li key={i.id}>{i.nome}: {Number(i.qtd).toLocaleString('pt-BR')} {i.unidade} <span className="text-pimenta-3">(mín. {Number(i.minimo).toLocaleString('pt-BR')})</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
