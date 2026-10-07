import { useMemo, useState } from 'react';
import { Trash2, AlertTriangle, Search, History, Pencil, ArrowDownUp, Package, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { traduzErro } from '../lib/data';
import { type EstoqueItem, type EstoqueMovimento } from '../types';
import { PageHeader, EmptyState, IconBtn, PrimaryBtn, GhostBtn, Modal, FieldLabel, Th, Td, inputClass, TableWrap, Segmented, Badge, Esqueleto, parseValor, useToast, useConfirmar } from './ui';

interface EstoqueTabProps {
  estoque: EstoqueItem[];
  setEstoque: (next: EstoqueItem[]) => void;
}

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'pct', 'cx', 'fardo', 'dz'];
const fmtQtd = (n: number) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
type TipoMov = 'entrada' | 'saida' | 'ajuste';

export default function EstoqueTab({ estoque, setEstoque }: EstoqueTabProps) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'baixo'>('todos');
  const [itemForm, setItemForm] = useState<{ id: string; nome: string; qtd: string; unidade: string; minimo: string } | null>(null);
  const [mov, setMov] = useState<{ item: EstoqueItem; tipo: TipoMov; qtd: string; motivo: string } | null>(null);
  const [hist, setHist] = useState<{ item: EstoqueItem; rows: EstoqueMovimento[] | null } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const baixos = estoque.filter((i) => Number(i.qtd) <= Number(i.minimo));
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (filtro === 'baixo' ? baixos : estoque)
      .filter((i) => !q || i.nome.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [estoque, baixos, busca, filtro]);

  const salvarItem = async () => {
    if (!itemForm) return;
    if (!itemForm.nome.trim()) return toast('Informe o nome do item.', 'erro');
    const minimo = parseValor(itemForm.minimo || '0');
    setSalvando(true);
    if (itemForm.id) {
      const { data, error } = await supabase.from('estoque')
        .update({ nome: itemForm.nome.trim(), unidade: itemForm.unidade, minimo: Number.isNaN(minimo) ? 0 : minimo })
        .eq('id', itemForm.id).select().single();
      setSalvando(false);
      if (error) return toast(traduzErro(error.message), 'erro');
      setEstoque(estoque.map((i) => (i.id === itemForm.id ? (data as EstoqueItem) : i)));
      toast('Item atualizado.');
    } else {
      const qtd = parseValor(itemForm.qtd || '0');
      if (Number.isNaN(qtd) || qtd < 0) { setSalvando(false); return toast('Quantidade inválida.', 'erro'); }
      const { data, error } = await supabase.from('estoque')
        .insert({ nome: itemForm.nome.trim(), qtd: 0, unidade: itemForm.unidade, minimo: Number.isNaN(minimo) ? 0 : minimo })
        .select().single();
      if (error) { setSalvando(false); return toast(traduzErro(error.message), 'erro'); }
      let item = data as EstoqueItem;
      if (qtd > 0) {
        const { data: saldo, error: e2 } = await supabase.rpc('movimentar_estoque', { p_item: item.id, p_tipo: 'entrada', p_quantidade: qtd, p_motivo: 'Estoque inicial' });
        if (!e2) item = { ...item, qtd: Number(saldo) };
      }
      setSalvando(false);
      setEstoque([...estoque, item]);
      toast('Item cadastrado.');
    }
    setItemForm(null);
  };

  const movimentar = async (item: EstoqueItem, tipo: TipoMov, qtd: number, motivo?: string) => {
    const { data, error } = await supabase.rpc('movimentar_estoque', { p_item: item.id, p_tipo: tipo, p_quantidade: qtd, p_motivo: motivo || null });
    if (error) { toast(traduzErro(error.message), 'erro'); return false; }
    setEstoque(estoque.map((i) => (i.id === item.id ? { ...i, qtd: Number(data) } : i)));
    return true;
  };

  const confirmarMov = async () => {
    if (!mov) return;
    const qtd = parseValor(mov.qtd);
    if (Number.isNaN(qtd) || qtd < 0 || (mov.tipo !== 'ajuste' && qtd === 0)) return toast('Informe uma quantidade válida.', 'erro');
    setSalvando(true);
    const ok = await movimentar(mov.item, mov.tipo, qtd, mov.motivo);
    setSalvando(false);
    if (ok) { toast(mov.tipo === 'entrada' ? 'Entrada registrada.' : mov.tipo === 'saida' ? 'Saída registrada.' : 'Estoque ajustado.'); setMov(null); }
  };

  const abrirHistorico = async (item: EstoqueItem) => {
    setHist({ item, rows: null });
    const { data, error } = await supabase.from('estoque_movimentos').select('*').eq('item_id', item.id).order('created_at', { ascending: false }).limit(100);
    if (error) toast(traduzErro(error.message), 'erro');
    setHist({ item, rows: (data || []) as EstoqueMovimento[] });
  };

  const remover = async (item: EstoqueItem) => {
    if (!(await confirmar({
      titulo: `Excluir "${item.nome}"?`,
      texto: 'O item e todo o histórico de entradas e saídas dele serão apagados.',
      acao: 'Excluir item', perigo: true,
    }))) return;
    const { error } = await supabase.from('estoque').delete().eq('id', item.id);
    if (error) return toast(traduzErro(error.message), 'erro');
    setEstoque(estoque.filter((i) => i.id !== item.id));
    setItemForm(null);
    toast('Item excluído.');
  };

  const Controles = ({ i }: { i: EstoqueItem }) => (
    <div className="flex items-center gap-1.5">
      <button onClick={() => movimentar(i, 'saida', 1)} aria-label="Tirar 1"
        className="pressionar w-11 h-11 md:w-8 md:h-8 rounded-lg border border-borda bg-white cursor-pointer hover:bg-linha text-lg md:text-base text-pimenta">–</button>
      <span className="tabular-nums min-w-[72px] text-center text-sm" style={{ color: Number(i.qtd) <= Number(i.minimo) ? '#B3261E' : '#3A2318' }}>
        {fmtQtd(i.qtd)} {i.unidade}
      </span>
      <button onClick={() => movimentar(i, 'entrada', 1)} aria-label="Adicionar 1"
        className="pressionar w-11 h-11 md:w-8 md:h-8 rounded-lg border border-borda bg-white cursor-pointer hover:bg-linha text-lg md:text-base text-pimenta">+</button>
    </div>
  );

  return (
    <div>
      <PageHeader title="Estoque" subtitle="Controle entradas e saídas e veja o que está acabando.">
        <PrimaryBtn onClick={() => setItemForm({ id: '', nome: '', qtd: '', unidade: 'un', minimo: '' })}>Novo item</PrimaryBtn>
      </PageHeader>

      {baixos.length > 0 && (
        <div className="mb-4 flex items-start gap-2.5 bg-erro-bg text-erro rounded-lg px-4 py-3 text-sm">
          <AlertTriangle size={17} className="shrink-0 mt-px" />
          <div><b>{baixos.length} {baixos.length === 1 ? 'item' : 'itens'} no mínimo ou abaixo:</b> {baixos.slice(0, 6).map((i) => i.nome).join(', ')}{baixos.length > 6 ? '…' : ''}</div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 mb-3 md:items-center">
        <Segmented value={filtro} onChange={setFiltro} options={[{ id: 'todos', label: `Todos (${estoque.length})` }, { id: 'baixo', label: `Comprar (${baixos.length})` }]} />
        <div className="relative md:w-[280px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pimenta-3" />
          <input type="search" enterKeyHint="search" aria-label="Buscar item" className={`${inputClass} pl-9`} placeholder="Buscar item" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      {lista.length === 0 ? (
        <TableWrap>
          {!estoque.length ? (
            <EmptyState icon={Package} title="Nenhum item no estoque"
              text="Cadastre o que você compra com frequência, como arroz, óleo e bebidas, e defina um mínimo. O Painel avisa antes de faltar.">
              <PrimaryBtn onClick={() => setItemForm({ id: '', nome: '', qtd: '', unidade: 'un', minimo: '' })}>Cadastrar primeiro item</PrimaryBtn>
            </EmptyState>
          ) : filtro === 'baixo' && !busca.trim() ? (
            <EmptyState icon={CheckCircle2} title="Nada para comprar" text="Todos os itens estão acima do mínimo." />
          ) : (
            <EmptyState icon={Search} title="Nenhum item encontrado" text="Confira se o nome está escrito certo.">
              <GhostBtn onClick={() => { setBusca(''); setFiltro('todos'); }}>Limpar busca</GhostBtn>
            </EmptyState>
          )}
        </TableWrap>
      ) : (
        <>
          <div className="md:hidden flex flex-col gap-2">
            {lista.map((i) => (
              <div key={i.id} className="bg-white border border-borda rounded-xl p-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{i.nome}</div>
                    <div className="text-[12px] text-pimenta-3">mínimo {fmtQtd(i.minimo)} {i.unidade}</div>
                  </div>
                  <Controles i={i} />
                </div>
                <div className="flex gap-1 mt-1.5 -mx-2 text-[13px] font-semibold">
                  <button onClick={() => setMov({ item: i, tipo: 'entrada', qtd: '', motivo: '' })} className="pressionar min-h-[40px] px-2 rounded-lg bg-transparent border-none text-urucum cursor-pointer">Movimentar</button>
                  <button onClick={() => abrirHistorico(i)} className="pressionar min-h-[40px] px-2 rounded-lg bg-transparent border-none text-pimenta-2 cursor-pointer">Histórico</button>
                  <button onClick={() => setItemForm({ id: i.id, nome: i.nome, qtd: '', unidade: i.unidade, minimo: String(i.minimo) })} className="pressionar min-h-[40px] px-2 rounded-lg bg-transparent border-none text-pimenta-2 cursor-pointer">Editar</button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <TableWrap>
              <table className="w-full border-collapse">
                <thead><tr><Th>Item</Th><Th>Quantidade</Th><Th>Mínimo</Th><Th>Situação</Th><Th></Th></tr></thead>
                <tbody>
                  {lista.map((i) => {
                    const baixo = Number(i.qtd) <= Number(i.minimo);
                    return (
                      <tr key={i.id} className="hover:bg-pele/50">
                        <Td className="font-semibold">{i.nome}</Td>
                        <Td><Controles i={i} /></Td>
                        <Td className="text-pimenta-3 tabular-nums">{fmtQtd(i.minimo)} {i.unidade}</Td>
                        <Td>{baixo ? <Badge tone="red"><AlertTriangle size={11} /> Comprar</Badge> : <Badge tone="green">OK</Badge>}</Td>
                        <Td>
                          <div className="flex justify-end">
                            <IconBtn onClick={() => setMov({ item: i, tipo: 'entrada', qtd: '', motivo: '' })} title="Movimentar (entrada, saída, ajuste)"><ArrowDownUp size={15} /></IconBtn>
                            <IconBtn onClick={() => abrirHistorico(i)} title="Histórico"><History size={15} /></IconBtn>
                            <IconBtn onClick={() => setItemForm({ id: i.id, nome: i.nome, qtd: '', unidade: i.unidade, minimo: String(i.minimo) })} title="Editar"><Pencil size={15} /></IconBtn>
                            <IconBtn onClick={() => remover(i)} color="#B3261E" title="Excluir"><Trash2 size={15} /></IconBtn>
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

      {itemForm && (
        <Modal title={itemForm.id ? 'Editar item' : 'Novo item de estoque'} onClose={() => setItemForm(null)}>
          <FieldLabel>Nome do item</FieldLabel>
          <input className={inputClass} value={itemForm.nome} onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })} placeholder="Ex: Arroz 5kg" autoFocus />
          <div className="grid grid-cols-2 gap-2.5">
            {!itemForm.id && (
              <div>
                <FieldLabel>Quantidade atual</FieldLabel>
                <input className={inputClass} inputMode="decimal" value={itemForm.qtd} onChange={(e) => setItemForm({ ...itemForm, qtd: e.target.value })} />
              </div>
            )}
            <div>
              <FieldLabel>Unidade</FieldLabel>
              <select className={inputClass} value={itemForm.unidade} onChange={(e) => setItemForm({ ...itemForm, unidade: e.target.value })}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Mínimo (alerta)</FieldLabel>
              <input className={inputClass} inputMode="decimal" value={itemForm.minimo} onChange={(e) => setItemForm({ ...itemForm, minimo: e.target.value })} />
            </div>
          </div>
          {itemForm.id && <p className="text-[12px] text-pimenta-3 mt-2 mb-0">Para mudar a quantidade, use “Movimentar”: assim fica registrado no histórico.</p>}
          <div className="mt-5"><PrimaryBtn onClick={salvarItem} disabled={salvando} icon={false} full>{salvando ? 'Salvando...' : 'Salvar item'}</PrimaryBtn></div>
          {itemForm.id && (
            <button onClick={() => { const it = estoque.find((x) => x.id === itemForm.id); if (it) remover(it); }}
              className="pressionar mt-2 w-full min-h-[44px] flex items-center justify-center gap-1.5 bg-transparent border-none text-erro text-[13px] font-semibold cursor-pointer rounded-xl hover:bg-erro-bg">
              <Trash2 size={14} /> Excluir item
            </button>
          )}
        </Modal>
      )}

      {mov && (
        <Modal title={`Movimentar: ${mov.item.nome}`} onClose={() => setMov(null)}>
          <p className="text-[13px] text-pimenta-3 mt-0">Saldo atual: <b className="text-pimenta tabular-nums">{fmtQtd(mov.item.qtd)} {mov.item.unidade}</b></p>
          <Segmented<TipoMov> value={mov.tipo} onChange={(t) => setMov({ ...mov, tipo: t })} options={[
            { id: 'entrada', label: 'Entrada (compra)' }, { id: 'saida', label: 'Saída (uso/perda)' }, { id: 'ajuste', label: 'Ajuste (contagem)' },
          ]} />
          <FieldLabel>{mov.tipo === 'ajuste' ? `Quantidade contada (${mov.item.unidade})` : `Quantidade (${mov.item.unidade})`}</FieldLabel>
          <input className={`${inputClass} tabular-nums`} inputMode="decimal" autoFocus value={mov.qtd} onChange={(e) => setMov({ ...mov, qtd: e.target.value })} />
          <FieldLabel>Motivo (opcional)</FieldLabel>
          <input className={inputClass} value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })}
            placeholder={mov.tipo === 'entrada' ? 'Ex: Compra Atacadão' : mov.tipo === 'saida' ? 'Ex: Perda, vencido' : 'Ex: Inventário semanal'} />
          <div className="mt-5"><PrimaryBtn onClick={confirmarMov} disabled={salvando} icon={false} full>{salvando ? 'Salvando...' : 'Confirmar'}</PrimaryBtn></div>
        </Modal>
      )}

      {hist && (
        <Modal title={`Histórico: ${hist.item.nome}`} onClose={() => setHist(null)} width={520}>
          {hist.rows === null ? (
            <div role="status" aria-label="Carregando histórico" className="flex flex-col gap-2.5 py-2">
              {[0, 1, 2, 3].map((k) => <Esqueleto key={k} className="h-9" />)}
            </div>
          ) : hist.rows.length === 0 ? (
            <EmptyState icon={History} title="Sem movimentações ainda" text="Entradas, saídas e ajustes deste item vão aparecer aqui." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><Th>Quando</Th><Th>Tipo</Th><Th right>Qtd</Th><Th right>Saldo</Th><Th>Motivo</Th></tr></thead>
                <tbody>
                  {hist.rows.map((m) => (
                    <tr key={m.id}>
                      <Td className="text-[12.5px] text-pimenta-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Td>
                      <Td><Badge tone={m.tipo === 'entrada' ? 'green' : m.tipo === 'saida' ? 'red' : 'neutral'}>{m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Ajuste'}</Badge></Td>
                      <Td className="tabular-nums text-right whitespace-nowrap">{m.tipo === 'entrada' ? '+' : m.tipo === 'saida' ? '−' : '='}{fmtQtd(m.quantidade)}</Td>
                      <Td className="tabular-nums text-right">{fmtQtd(m.saldo_apos)}</Td>
                      <Td className="text-[13px] text-pimenta-3">{m.motivo || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
