import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard, Package, Wallet, Receipt, ShieldCheck, LogOut, Lock, BarChart3, Users, Menu, X, Store,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth, situacaoAcesso } from './lib/auth';
import { fetchAll } from './lib/data';
import { type EstoqueItem, type CaixaItem, type ContaItem, type FormaPagamento, type Restaurante, todayISO, addMonths } from './types';
import { ToastProvider } from './components/ui';
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
      <Root />
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
    <div className="bg-paper min-h-screen flex items-center justify-center font-sans text-ink gap-3">
      <div className="w-5 h-5 border-2 border-green border-t-transparent rounded-full animate-spin" />
      {text}
    </div>
  );
}

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

  const caixaAtivo = useMemo(() => caixa.filter((c) => !c.excluido_em), [caixa]);

  if (loading) return <Splash text="Carregando painel..." />;

  const nav = (
    <>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={`flex items-center gap-2.5 w-full py-3 px-6 ${active ? 'bg-paper text-green-dark md:rounded-l-lg' : 'text-sidebar-text hover:text-sidebar-active'} border-none cursor-pointer text-[14.5px] font-semibold text-left transition-colors`}
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
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Store size={18} /></div>
      <div className="min-w-0">
        <div className="font-serif text-[17px] font-bold leading-tight truncate">{restaurante?.nome || 'Painel do Restaurante'}</div>
        <div className="text-[11px] text-sidebar-text">Painel do Restaurante</div>
      </div>
    </div>
  );

  return (
    <div className="bg-paper min-h-screen text-ink font-sans">
      {/* Topo no celular */}
      <header className="md:hidden sticky top-0 z-40 bg-green text-[#F2EFE4] px-4 py-3 flex items-center justify-between gap-3">
        {brand}
        <button onClick={() => setMenuOpen(true)} aria-label="Abrir menu" className="bg-transparent border-none text-[#F2EFE4] p-1 cursor-pointer"><Menu size={24} /></button>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}>
          <nav className="absolute right-0 top-0 bottom-0 w-[270px] bg-green text-[#F2EFE4] py-5 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 pb-4 mb-2 border-b border-white/10">
              <span className="font-serif font-bold text-lg">Menu</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="bg-transparent border-none text-[#F2EFE4] cursor-pointer"><X size={22} /></button>
            </div>
            {nav}
          </nav>
        </div>
      )}

      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-[236px] bg-green text-[#F2EFE4] py-6 shrink-0 flex-col sticky top-0 h-screen">
          <div className="px-5 pb-5 border-b border-white/10 mb-3">{brand}</div>
          {nav}
        </aside>

        <main className="flex-1 min-w-0 p-4 md:p-8 md:px-10 max-w-[1180px]">
          {erro && (
            <div className="mb-4 text-[13px] text-red bg-red-bg px-4 py-3 rounded-lg flex justify-between gap-3 items-center">
              <span>Não foi possível carregar os dados: {erro}</span>
              <button onClick={carregar} className="font-semibold bg-transparent border border-red/40 text-red rounded-md px-3 py-1 cursor-pointer">Tentar de novo</button>
            </div>
          )}
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
        </main>
      </div>
    </div>
  );
}
