import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard, Package, Wallet, Receipt, ShieldCheck, LogOut, Lock, BarChart3, Users, Store, MoreHorizontal, AlertCircle,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth, situacaoAcesso } from './lib/auth';
import { fetchAll, traduzErro } from './lib/data';
import { type EstoqueItem, type CaixaItem, type ContaItem, type FormaPagamento, type Restaurante, todayISO, addMonths } from './types';
import { ToastProvider, ConfirmProvider, Modal, Esqueleto } from './components/ui';
import ResumoTab from './components/ResumoTab';
import EstoqueTab from './components/EstoqueTab';
import CaixaTab from './components/CaixaTab';
import ContasTab from './components/ContasTab';
import FechamentoTab from './components/FechamentoTab';
import RelatoriosTab from './components/RelatoriosTab';
import EquipeTab from './components/EquipeTab';
import AdminTab from './components/AdminTab';
import AuthScreen, { type Mode as AuthMode } from './components/AuthScreen';
import Landing from './components/Landing';
import { AcessoScreen, NovaSenhaScreen } from './components/WaitingScreen';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Root />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function Root() {
  const { loading, session, profile, restaurante, signOut, refresh } = useAuth();
  const [recuperando, setRecuperando] = useState(() => window.location.hash.includes('type=recovery'));
  // Tela inicial para quem não está logado: apresentação. '#entrar' / '#cadastro' abrem direto o login/cadastro.
  const [telaAuth, setTelaAuth] = useState<AuthMode | null>(() =>
    window.location.hash === '#entrar' ? 'login' : window.location.hash === '#cadastro' ? 'dono' : null);
  const abrirAuth = (m: AuthMode | null) => {
    setTelaAuth(m);
    window.history.replaceState(null, '', m ? (m === 'login' ? '#entrar' : '#cadastro') : window.location.pathname);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setRecuperando(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (loading) return <Splash text="Carregando..." />;
  if (!session || !profile) {
    if (!telaAuth) {
      return <Landing onEntrar={() => abrirAuth('login')} onCadastrar={() => abrirAuth('dono')} />;
    }
    return <AuthScreen key={telaAuth} inicial={telaAuth} onVoltar={() => abrirAuth(null)} />;
  }
  if (recuperando) {
    return <NovaSenhaScreen email={profile.email} onDone={() => { setRecuperando(false); window.history.replaceState(null, '', window.location.pathname); }} />;
  }

  const acesso = situacaoAcesso(profile, restaurante, todayISO());
  const isAdmin = profile.role === 'admin';

  // O admin da plataforma sempre consegue chegar na aba Admin, mesmo se o próprio restaurante estiver bloqueado
  if (acesso !== 'ok' && !isAdmin) {
    return <AcessoScreen acesso={acesso} email={profile.email} restaurante={restaurante} onSignOut={signOut} onRefresh={refresh} />;
  }

  return (
    <Dashboard
      key={restaurante?.id || 'none'}
      isAdmin={isAdmin}
      isDono={profile.papel === 'dono'}
      dadosLiberados={acesso === 'ok'}
      email={profile.email}
      restaurante={restaurante}
      onSignOut={signOut}
      onRefresh={refresh}
    />
  );
}

function Splash({ text }: { text: string }) {
  return (
    <div className="bg-pele min-h-[100dvh] flex flex-col items-center justify-center font-sans text-pimenta-3 gap-4" role="status">
      <div className="w-12 h-12 rounded-2xl bg-urucum text-white flex items-center justify-center animate-pulse"><Store size={22} /></div>
      <span className="text-[14px]">{text}</span>
    </div>
  );
}

/** Carregando o painel: blocos no formato dos cartões e da lista que vão aparecer. */
function PainelCarregando() {
  return (
    <div role="status" aria-label="Carregando seus dados">
      <Esqueleto className="h-9 w-48 mb-2" />
      <Esqueleto className="h-4 w-64 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-[104px] rounded-2xl" />)}
      </div>
      <div className="flex flex-col lg:flex-row gap-5">
        <Esqueleto className="h-[320px] lg:w-[360px] rounded-2xl" />
        <Esqueleto className="h-[240px] flex-1 rounded-2xl" />
      </div>
    </div>
  );
}

// Nomes curtos para a barra de baixo do celular
const ROTULO_CURTO: Partial<Record<TabId, string>> = { contas: 'Contas', equipe: 'Equipe', admin: 'Admin' };

type TabId = 'resumo' | 'caixa' | 'fechamento' | 'relatorios' | 'estoque' | 'contas' | 'equipe' | 'admin';

function Dashboard({ isAdmin, isDono, dadosLiberados, email, restaurante, onSignOut, onRefresh }: {
  isAdmin: boolean; isDono: boolean; dadosLiberados: boolean; email: string; restaurante: Restaurante | null;
  onSignOut: () => Promise<void>; onRefresh: () => Promise<void>;
}) {
  const tabs = useMemo(() => {
    const t: { id: TabId; label: string; icon: typeof Package }[] = [];
    if (dadosLiberados) {
      if (isDono) t.push({ id: 'resumo', label: 'Resumo', icon: LayoutDashboard });
      t.push({ id: 'caixa', label: 'Caixa', icon: Wallet });
      t.push({ id: 'fechamento', label: 'Fechamento', icon: Lock });
      if (isDono) t.push({ id: 'relatorios', label: 'Relatórios', icon: BarChart3 });
      t.push({ id: 'estoque', label: 'Estoque', icon: Package });
      if (isDono) t.push({ id: 'contas', label: 'Contas a pagar', icon: Receipt });
      if (isDono) t.push({ id: 'equipe', label: 'Restaurante e equipe', icon: Users });
    }
    if (isAdmin) t.push({ id: 'admin', label: 'Admin da plataforma', icon: ShieldCheck });
    return t;
  }, [dadosLiberados, isDono, isAdmin]);

  const [tab, setTab] = useState<TabId>(tabs[0]?.id || 'admin');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tentando, setTentando] = useState(false);
  const [loading, setLoading] = useState(dadosLiberados);
  const [erro, setErro] = useState<string | null>(null);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [caixa, setCaixa] = useState<CaixaItem[]>([]);
  const [contas, setContas] = useState<ContaItem[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);

  const carregar = useCallback(async () => {
    if (!dadosLiberados) return;
    setErro(null);
    try {
      // Carrega os últimos 24 meses de caixa (suficiente p/ relatórios e comparativos)
      const desde = addMonths(todayISO(), -24);
      const [e, c, ct, fp] = await Promise.all([
        fetchAll<EstoqueItem>(() => supabase.from('estoque').select('*').order('nome')),
        fetchAll<CaixaItem>(() => supabase.from('caixa').select('*').gte('data', desde).order('data', { ascending: false }).order('created_at', { ascending: false })),
        // Contas a pagar: só o dono (o banco também bloqueia para funcionário)
        isDono ? fetchAll<ContaItem>(() => supabase.from('contas').select('*').order('vencimento')) : Promise.resolve([] as ContaItem[]),
        fetchAll<FormaPagamento>(() => supabase.from('formas_pagamento').select('*').order('ordem')),
      ]);
      setEstoque(e);
      setCaixa(c);
      setContas(ct);
      setFormasPagamento(fp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [dadosLiberados, isDono]);

  useEffect(() => { carregar(); }, [carregar]);

  const go = (id: TabId) => { setTab(id); setMenuOpen(false); window.scrollTo(0, 0); };

  // Barra do navegador no celular na mesma cor do topo do painel
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const antes = meta.content;
    meta.content = '#3A2318';
    return () => { meta.content = antes; };
  }, []);

  const tentarDeNovo = async () => { setTentando(true); await carregar(); setTentando(false); };

  const caixaAtivo = useMemo(() => caixa.filter((c) => !c.excluido_em), [caixa]);

  // Funcionário vê só as abas que tem acesso (Caixa, Fechamento, Estoque)
  const barra = tabs.slice(0, 3);
  const resto = tabs.slice(3);
  const maisAtivo = resto.some((t) => t.id === tab);

  const nav = (
    <>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 w-full py-3 px-6 ${active ? 'bg-pele text-urucum md:rounded-l-2xl' : 'text-sidebar-text hover:text-sidebar-active'} border-none cursor-pointer text-[14.5px] font-semibold text-left transition-colors`}
          >
            <Icon size={17} strokeWidth={2} />
            {t.label}
          </button>
        );
      })}
      <div className="mt-auto px-6 pt-6 pb-2">
        <div className="text-[11.5px] text-sidebar-text truncate mb-2" title={email}>{email}</div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-[13px] font-semibold text-sidebar-text hover:text-sidebar-active bg-transparent border-none cursor-pointer transition-colors p-0"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </>
  );

  const brand = (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-urucum text-white flex items-center justify-center shrink-0"><Store size={18} /></div>
      <div className="min-w-0">
        <div className="font-display text-[18px] leading-tight break-words">{restaurante?.nome || 'Painel do Restaurante'}</div>
        <div className="text-[11px] text-sidebar-text">Painel do Restaurante</div>
      </div>
    </div>
  );

  return (
    <div className="bg-pele min-h-screen text-pimenta font-sans">
      {/* Topo no celular (desce abaixo do notch) */}
      <header className="md:hidden sticky top-0 z-40 bg-pimenta text-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3">
        {brand}
      </header>

      <div className="flex min-h-screen">
        <aside className="foco-claro hidden md:flex w-[236px] bg-pimenta text-white py-6 shrink-0 flex-col sticky top-0 h-screen">
          <div className="px-5 pb-5 border-b border-white/10 mb-3">{brand}</div>
          {nav}
        </aside>

        <main className="flex-1 min-w-0 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:px-10"><div className="max-w-[1440px] mx-auto">
          {erro && (
            <div role="alert" className="mb-5 bg-erro-bg rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <AlertCircle size={18} className="text-erro shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[14px] text-erro">Não foi possível carregar seus dados.</div>
                  <div className="text-[13px] text-pimenta-2 mt-0.5">{traduzErro(erro)}</div>
                </div>
              </div>
              <button onClick={tentarDeNovo} disabled={tentando}
                className="pressionar shrink-0 min-h-[44px] md:min-h-[38px] px-4 rounded-xl bg-erro text-white text-[13.5px] font-semibold border-none cursor-pointer disabled:opacity-60">
                {tentando ? 'Tentando...' : 'Tentar de novo'}
              </button>
            </div>
          )}
          {loading ? <PainelCarregando /> : <>
          {tab === 'resumo' && <ResumoTab caixa={caixaAtivo} contas={contas} estoque={estoque} onNavigate={(t) => go(t as TabId)} />}
          {tab === 'caixa' && (
            <CaixaTab caixa={caixa} setCaixa={setCaixa} formasPagamento={formasPagamento} setFormasPagamento={setFormasPagamento} isDono={isDono} />
          )}
          {tab === 'fechamento' && <FechamentoTab caixa={caixaAtivo} formasPagamento={formasPagamento} isDono={isDono} />}
          {tab === 'relatorios' && <RelatoriosTab caixa={caixaAtivo} formasPagamento={formasPagamento} />}
          {tab === 'estoque' && <EstoqueTab estoque={estoque} setEstoque={setEstoque} />}
          {tab === 'contas' && <ContasTab contas={contas} setContas={setContas} caixa={caixa} setCaixa={setCaixa} formasPagamento={formasPagamento} />}
          {tab === 'equipe' && restaurante && <EquipeTab restaurante={restaurante} onRefresh={onRefresh} />}
          {tab === 'admin' && isAdmin && <AdminTab />}
          </>}
        </div></main>
      </div>

      {/* Celular: barra de baixo, perto do polegar. As 3 primeiras abas que a pessoa tem + "Mais". */}
      <nav aria-label="Navegação principal"
        className="barra-inferior md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-borda pb-[env(safe-area-inset-bottom)]">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${barra.length + 1}, minmax(0, 1fr))` }}>
          {barra.map((t) => (
            <ItemBarra key={t.id} icon={t.icon} label={ROTULO_CURTO[t.id] || t.label} ativo={tab === t.id} onClick={() => go(t.id)} />
          ))}
          <ItemBarra icon={MoreHorizontal} label="Mais" ativo={maisAtivo} onClick={() => setMenuOpen(true)} />
        </div>
      </nav>

      {menuOpen && (
        <Modal title="Mais opções" onClose={() => setMenuOpen(false)}>
          <div className="flex flex-col -mx-2">
            {resto.map((t) => {
              const Icon = t.icon;
              const ativo = tab === t.id;
              return (
                <button key={t.id} onClick={() => go(t.id)} aria-current={ativo ? 'page' : undefined}
                  className={`pressionar flex items-center gap-3 min-h-[52px] px-3 rounded-xl border-none cursor-pointer text-[15px] font-semibold text-left ${ativo ? 'bg-urucum-bg text-urucum' : 'bg-transparent text-pimenta hover:bg-pele'}`}>
                  <Icon size={19} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className={`${resto.length ? 'border-t border-linha mt-3 pt-3' : ''}`}>
            <div className="text-[12.5px] text-pimenta-3 truncate mb-1" title={email}>Conectado como {email}</div>
            <button onClick={onSignOut}
              className="pressionar flex items-center gap-3 w-full min-h-[48px] -mx-2 px-2 rounded-xl text-[15px] font-semibold text-erro bg-transparent border-none cursor-pointer hover:bg-erro-bg">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ItemBarra({ icon: Icon, label, ativo, onClick }: { icon: typeof Package; label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={ativo ? 'page' : undefined}
      className={`pressionar flex flex-col items-center justify-center gap-1 h-16 bg-transparent border-none cursor-pointer text-[11.5px] font-semibold ${ativo ? 'text-urucum' : 'text-pimenta-3'}`}>
      <span className={`flex items-center justify-center w-14 h-7 rounded-full transition-colors ${ativo ? 'bg-urucum-bg' : ''}`}>
        <Icon size={20} strokeWidth={ativo ? 2.25 : 2} />
      </span>
      {label}
    </button>
  );
}
