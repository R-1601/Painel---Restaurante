export interface EstoqueItem {
  id: string;
  nome: string;
  qtd: number;
  unidade: string;
  minimo: number;
}

export interface EstoqueMovimento {
  id: string;
  item_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  saldo_apos: number;
  motivo?: string | null;
  created_at: string;
}

export interface CaixaItem {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  canal?: string | null;
  forma_pagamento?: string | null;
  taxa?: number | null;
  categoria?: string | null;
  created_at?: string;
}

export interface ContaItem {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: 'pendente' | 'pago';
  recorrente?: boolean;
  pago_em?: string | null;
}

export interface FormaPagamento {
  id: string;
  label: string;
  taxa: number;
  ordem: number;
}

export interface Fechamento {
  id: string;
  data: string;
  status: 'aberto' | 'fechado';
  troco_inicial: number;
  dinheiro_contado: number | null;
  dinheiro_esperado: number | null;
  diferenca: number | null;
  total_vendas: number | null;
  total_despesas: number | null;
  observacao: string | null;
  fechado_em: string | null;
}

export interface Restaurante {
  id: string;
  nome: string;
  status: 'pendente' | 'ativo' | 'bloqueado';
  pago_ate: string | null;
  codigo_convite: string;
  created_at?: string;
}

export const CATEGORIAS_CONTA = [
  { id: 'agua', label: 'Água' },
  { id: 'luz', label: 'Luz' },
  { id: 'gas', label: 'Gás' },
  { id: 'internet', label: 'Internet/Telefone' },
  { id: 'fornecedor', label: 'Fornecedor' },
  { id: 'aluguel', label: 'Aluguel' },
  { id: 'funcionario', label: 'Salário/Funcionário' },
  { id: 'imposto', label: 'Imposto' },
  { id: 'outro', label: 'Outro' },
];

export const CANAIS_VENDA = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'balcao', label: 'Balcão' },
  { id: 'salao', label: 'Salão/Mesa' },
  { id: 'retirada', label: 'Retirada' },
];

export const CATEGORIAS_DESPESA = [
  { id: 'ingredientes', label: 'Ingredientes' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'embalagem', label: 'Embalagem' },
  { id: 'funcionario', label: 'Funcionário' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'limpeza', label: 'Limpeza' },
  { id: 'taxas_app', label: 'Taxa de app/plataforma' },
  { id: 'sangria', label: 'Sangria/Retirada do caixa' },
  { id: 'outro', label: 'Outro' },
];

export const labelOf = (list: { id: string; label: string }[], id?: string | null) =>
  list.find((k) => k.id === id)?.label || id || '—';

/* ===== Datas (sempre no horário local, nunca UTC) ===== */
const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO() {
  return toISODate(new Date());
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

export function addDays(iso: string, n: number) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Soma meses mantendo o dia (ajusta p/ último dia do mês quando necessário). */
export function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimo));
  return toISODate(alvo);
}

export function monthKeyOffset(offset: number) {
  const d = new Date();
  const alvo = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${alvo.getFullYear()}-${pad(alvo.getMonth() + 1)}`;
}

export function monthRange(key: string): [string, string] {
  const [y, m] = key.split('-').map(Number);
  const fim = new Date(y, m, 0).getDate();
  return [`${key}-01`, `${key}-${pad(fim)}`];
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000);
}

export function formatBRL(v: number) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDatePt(iso?: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatMonthPt(key: string) {
  const s = parseISODate(`${key}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ===== Cálculos de caixa ===== */
export const valorTaxa = (c: CaixaItem) =>
  c.tipo === 'entrada' ? (Number(c.valor) * Number(c.taxa || 0)) / 100 : 0;

export const valorLiquido = (c: CaixaItem) =>
  c.tipo === 'entrada' ? Number(c.valor) - valorTaxa(c) : Number(c.valor);

export interface Totais {
  bruto: number;
  taxas: number;
  liquido: number;
  despesas: number;
  saldo: number;
  vendas: number;
  ticketMedio: number;
}

export function calcularTotais(itens: CaixaItem[]): Totais {
  let bruto = 0, taxas = 0, despesas = 0, vendas = 0;
  for (const c of itens) {
    if (c.tipo === 'entrada') {
      bruto += Number(c.valor);
      taxas += valorTaxa(c);
      vendas++;
    } else {
      despesas += Number(c.valor);
    }
  }
  const liquido = bruto - taxas;
  return { bruto, taxas, liquido, despesas, saldo: liquido - despesas, vendas, ticketMedio: vendas ? bruto / vendas : 0 };
}

export function inRange(iso: string, de: string, ate: string) {
  return iso >= de && iso <= ate;
}

export function pctVariacao(atual: number, anterior: number) {
  if (!anterior) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function situacaoConta(c: ContaItem, hoje = todayISO()) {
  if (c.status === 'pago') return { tone: 'green' as const, label: 'Paga' };
  const d = daysBetween(hoje, c.vencimento);
  if (d < 0) return { tone: 'red' as const, label: `Vencida há ${-d} dia${d === -1 ? '' : 's'}` };
  if (d === 0) return { tone: 'red' as const, label: 'Vence hoje' };
  if (d <= 7) return { tone: 'gold' as const, label: `Vence em ${d} dia${d === 1 ? '' : 's'}` };
  return { tone: 'neutral' as const, label: 'Em dia' };
}
