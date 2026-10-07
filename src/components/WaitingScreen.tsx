import { useState } from 'react';
import { Clock, XCircle, LogOut, Lock, CreditCard, RefreshCw, MessageCircle, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Acesso } from '../lib/auth';
import { traduzErro } from '../lib/data';
import { type Restaurante, formatDatePt } from '../types';
import { inputClass } from './ui';

const WHATSAPP = (import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined)?.replace(/\D/g, '');

const CONTEUDO: Record<Exclude<Acesso, 'ok'>, { icon: typeof Clock; tone: 'teal' | 'red' | 'gold'; titulo: string; texto: (r: Restaurante | null) => string }> = {
  restaurante_pendente: {
    icon: Clock, tone: 'teal', titulo: 'Conta criada! Falta só ativar',
    texto: (r) => `O restaurante "${r?.nome || ''}" foi cadastrado. Assim que a assinatura for ativada, o painel é liberado e você já pode começar a usar.`,
  },
  usuario_pendente: {
    icon: Clock, tone: 'teal', titulo: 'Aguardando aprovação',
    texto: (r) => `Seu cadastro na equipe de "${r?.nome || 'seu restaurante'}" foi enviado. Peça para o dono aprovar seu acesso na aba "Restaurante e equipe".`,
  },
  usuario_recusado: {
    icon: XCircle, tone: 'red', titulo: 'Acesso não liberado',
    texto: () => 'Seu acesso foi recusado ou revogado. Fale com o dono do restaurante para mais informações.',
  },
  restaurante_bloqueado: {
    icon: Lock, tone: 'red', titulo: 'Acesso suspenso',
    texto: () => 'O acesso deste restaurante está suspenso. Seus dados continuam guardados. Entre em contato com o suporte para reativar.',
  },
  assinatura_vencida: {
    icon: CreditCard, tone: 'gold', titulo: 'Assinatura vencida',
    texto: (r) => `A assinatura venceu em ${formatDatePt(r?.pago_ate)}. Seus dados continuam guardados: renove para voltar a acessar o painel.`,
  },
  sem_restaurante: {
    icon: XCircle, tone: 'red', titulo: 'Conta sem restaurante',
    texto: () => 'Sua conta não está ligada a nenhum restaurante. Entre em contato com o suporte.',
  },
};

const TONES = { teal: 'bg-louro-bg text-louro', red: 'bg-erro-bg text-erro', gold: 'bg-acafrao-bg text-acafrao-dark' };

export function AcessoScreen({ acesso, email, restaurante, onSignOut, onRefresh }: {
  acesso: Exclude<Acesso, 'ok'>; email: string; restaurante: Restaurante | null; onSignOut: () => void; onRefresh: () => Promise<void>;
}) {
  const c = CONTEUDO[acesso];
  const Icon = c.icon;
  const [checando, setChecando] = useState(false);
  const mostraSuporte = WHATSAPP && ['restaurante_pendente', 'restaurante_bloqueado', 'assinatura_vencida', 'sem_restaurante'].includes(acesso);
  const msg = encodeURIComponent(`Olá! Quero ${acesso === 'restaurante_pendente' ? 'ativar' : 'renovar'} o Painel do Restaurante (${restaurante?.nome || email}).`);

  return (
    <Shell email={email} onSignOut={onSignOut}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${TONES[c.tone]}`}>
        <Icon size={26} />
      </div>
      <h2 className="font-display text-[22px] font-bold text-pimenta m-0 mb-2">{c.titulo}</h2>
      <p className="text-[14px] text-pimenta-2 leading-relaxed max-w-[360px] mx-auto">{c.texto(restaurante)}</p>
      <div className="flex flex-col gap-2 mt-5">
        {mostraSuporte && (
          <a href={`https://wa.me/${WHATSAPP}?text=${msg}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-urucum text-white px-4 py-2.5 rounded-lg text-sm font-semibold no-underline hover:bg-urucum-dark">
            <MessageCircle size={16} /> Falar com o suporte
          </a>
        )}
        <button
          onClick={async () => { setChecando(true); await onRefresh(); setChecando(false); }}
          className="inline-flex items-center justify-center gap-2 bg-white text-pimenta border border-borda px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-pele"
        >
          <RefreshCw size={15} className={checando ? 'animate-spin' : ''} /> Já liberaram? Verificar de novo
        </button>
      </div>
    </Shell>
  );
}

export function NovaSenhaScreen({ email, onDone }: { email: string; onDone: () => void }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const salvar = async () => {
    if (senha.length < 6) return setErro('A senha deve ter ao menos 6 caracteres.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) return setErro(traduzErro(error.message));
    onDone();
  };
  return (
    <Shell email={email} onSignOut={() => supabase.auth.signOut()}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-louro-bg text-louro"><KeyRound size={26} /></div>
      <h2 className="font-display text-[22px] font-bold text-pimenta m-0 mb-4">Criar nova senha</h2>
      <input type="password" className={inputClass} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)" autoComplete="new-password" />
      {erro && <div className="text-[12.5px] text-erro bg-erro-bg px-3 py-2 rounded-md mt-3 text-left">{erro}</div>}
      <button onClick={salvar} disabled={loading}
        className="w-full mt-4 bg-urucum text-white border-none px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer hover:bg-urucum-dark disabled:opacity-60">
        {loading ? 'Salvando...' : 'Salvar nova senha'}
      </button>
    </Shell>
  );
}

function Shell({ email, onSignOut, children }: { email: string; onSignOut: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-pele flex items-center justify-center font-sans text-pimenta px-4">
      <div className="w-full max-w-[420px] text-center">
        <div className="font-display text-[24px] font-bold text-pimenta mb-6">Painel do Restaurante</div>
        <div className="bg-white rounded-xl border border-borda p-6 md:p-8 shadow-sm">
          {children}
          <div className="mt-5 pt-4 border-t border-linha text-[12px] text-pimenta-3">Conta: {email}</div>
          <button
            onClick={onSignOut}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pimenta-2 hover:text-pimenta bg-transparent border-none cursor-pointer"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
