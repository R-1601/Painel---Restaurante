import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { Plus, X, CheckCircle2, AlertCircle, type LucideIcon } from 'lucide-react';

/* ============ Layout ============ */
export function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="font-display font-normal text-[28px] md:text-[34px] text-pimenta leading-[1.05] m-0">{children}</h1>
      {subtitle && <p className="text-[14px] text-pimenta-3 mt-1 mb-0">{subtitle}</p>}
    </div>
  );
}

/** Título + ações, empilhando no celular. */
export function PageHeader({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 mb-5">
      <div className="[&>div]:mb-0"><SectionTitle subtitle={subtitle}>{title}</SectionTitle></div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl ${className}`}>{children}</div>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-x-auto">
      {children}
    </div>
  );
}

/** Tela vazia: diz o que aconteceu e qual o próximo passo. */
export function EmptyState({ icon: Icon, title, text, children }: { icon?: LucideIcon; title: string; text?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="py-10 md:py-12 px-6 flex flex-col items-center text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-urucum-bg text-urucum flex items-center justify-center mb-3.5">
          <Icon size={22} strokeWidth={2} />
        </div>
      )}
      <div className="font-semibold text-[15.5px] text-pimenta">{title}</div>
      {text && <p className="text-[13.5px] text-pimenta-3 leading-relaxed mt-1 mb-0 max-w-[42ch]">{text}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Bloco de carregamento no formato do conteúdo que vai aparecer. */
export function Esqueleto({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`bg-linha rounded-lg animate-pulse ${className}`} />;
}

// "R$ 0,00" ou "− R$ 0,00": zero não é alerta nem conquista, aparece neutro
const ZERO = /^[−-]?\s*R\$\s*0,00$/;
export const ehZero = (valor: string) => ZERO.test(valor.trim());

export function Stat({ label, value, hint, color, small, destaque }: {
  label: string; value: string; hint?: React.ReactNode; color?: string; small?: boolean;
  /** O número principal da tela: faixa cheia e valor maior. */
  destaque?: boolean;
}) {
  const zero = ZERO.test(value.trim());
  const mostrado = zero ? value.trim().replace(/^[−-]\s*/, '') : value;
  const tamanho = destaque
    ? (small ? 'text-[23px] md:text-[27px]' : 'text-[26px] md:text-[30px]')
    : (small ? 'text-[19px]' : 'text-[22px] md:text-[25px]');
  return (
    // Faixa urucum cheia só no destaque; nos demais, um tom mais claro da mesma cor
    <div className={`bg-white rounded-2xl p-4 border-t-[5px] ${destaque ? 'border-urucum' : 'border-urucum/25'}`}>
      <div className={`text-[13px] font-medium ${destaque ? 'text-pimenta-2' : 'text-pimenta-3'}`}>{label}</div>
      <div className={`tabular-nums font-semibold leading-tight mt-1 ${tamanho}`} style={{ color: zero ? '#7E6254' : color || '#3A2318' }}>{mostrado}</div>
      {hint && <div className="text-[12px] text-pimenta-3 mt-1">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'green' | 'red' | 'gold' | 'neutral' }) {
  const tones = {
    green: 'bg-louro-bg text-louro',
    red: 'bg-erro-bg text-erro',
    gold: 'bg-acafrao-bg text-acafrao-dark',
    neutral: 'bg-linha text-pimenta-2',
  };
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/* ============ Botões ============ */
export function IconBtn({ onClick, color, children, title }: { onClick: () => void; color?: string; children: React.ReactNode; title?: string }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="pressionar bg-transparent border-none cursor-pointer p-2 flex rounded-lg hover:bg-pele" style={{ color: color || '#7E6254' }}>
      {children}
    </button>
  );
}

export function PrimaryBtn({ onClick, children, disabled, icon = true, type = 'button', full }: {
  onClick?: () => void; children: React.ReactNode; disabled?: boolean; icon?: boolean; type?: 'button' | 'submit'; full?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pressionar flex items-center justify-center gap-1.5 bg-urucum text-white border-none px-4 min-h-[44px] md:min-h-[40px] rounded-xl text-sm font-semibold cursor-pointer hover:bg-urucum-dark disabled:opacity-60 disabled:cursor-not-allowed ${full ? 'w-full' : ''}`}
    >
      {icon && <Plus size={16} />} {children}
    </button>
  );
}

export function GhostBtn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="pressionar flex items-center justify-center gap-1.5 bg-white text-pimenta border border-borda px-3.5 min-h-[44px] md:min-h-[40px] rounded-xl text-sm font-semibold cursor-pointer hover:border-pimenta-4 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Botões de escolha (período, filtro). No celular ficam numa linha só, rolando para o lado. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 bg-white rounded-xl p-1 whitespace-nowrap">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={`pressionar px-3 min-h-[38px] md:min-h-[32px] rounded-lg text-[13px] font-semibold border-none cursor-pointer ${value === o.id ? 'bg-urucum text-white' : 'bg-transparent text-pimenta-2 hover:bg-pele'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============ Tabela ============ */
export function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`${right ? 'text-right' : 'text-left'} px-3 py-2.5 text-[12.5px] font-semibold text-pimenta-3 border-b border-linha whitespace-nowrap`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', style, colSpan }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-3 py-3 text-sm border-b border-linha ${className}`} style={style}>{children}</td>;
}

/* ============ Janela (modal) ============ */
// Tempo da animação de saída (igual ao do index.css)
const SAIDA_MS = 160;

/**
 * No celular é uma folha que sobe de baixo; no computador, uma janela no centro.
 * Fechar pelo X, pelo fundo ou pelo Esc anima a saída antes de sumir.
 */
export function Modal({ title, onClose, children, width = 400 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  const tituloId = useId();
  const [saindo, setSaindo] = useState(false);
  const saindoRef = useRef(false);

  const fechar = useCallback(() => {
    if (saindoRef.current) return;
    saindoRef.current = true;
    setSaindo(true);
    setTimeout(onClose, SAIDA_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fechar]);

  // A página de trás não rola enquanto a janela está aberta
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, []);

  return (
    <div
      className={`modal-fundo fixed inset-0 bg-[rgba(58,35,24,0.5)] flex items-end md:items-center justify-center z-50 ${saindo ? 'saindo' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby={tituloId}
        className={`modal-caixa bg-white rounded-t-3xl md:rounded-2xl px-5 pt-3 md:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-6 overflow-y-auto overscroll-contain shadow-2xl w-full ${saindo ? 'saindo' : ''}`}
        style={{ maxWidth: width, maxHeight: '90dvh' }}
      >
        <div aria-hidden className="md:hidden w-10 h-1 rounded-full bg-borda mx-auto mb-3" />
        <div className="flex justify-between items-center gap-3 mb-3">
          <h3 id={tituloId} className="m-0 font-display font-normal text-[22px] text-pimenta">{title}</h3>
          <button onClick={fechar} aria-label="Fechar" className="pressionar bg-transparent border-none cursor-pointer text-pimenta-3 p-2.5 -mr-2.5 rounded-full hover:bg-pele">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============ Confirmação ============ */
type ConfirmOpts = {
  titulo: string;
  texto?: React.ReactNode;
  /** Texto do botão que confirma, com o verbo da ação (ex.: "Excluir item"). */
  acao: string;
  /** Texto do botão que desiste. */
  cancelar?: string;
  /** Ação destrutiva: botão vermelho. */
  perigo?: boolean;
};
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

/** Substitui a caixinha padrão do navegador por uma janela no visual do Painel. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<(ConfirmOpts & { responder: (v: boolean) => void }) | null>(null);
  const confirmar = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => {
    let respondido = false;
    const este = {
      ...o,
      // Responde uma vez só (o fechamento animado pode chamar de novo depois)
      responder: (v: boolean) => {
        if (respondido) return;
        respondido = true;
        resolve(v);
        setPedido((atual) => (atual === este ? null : atual));
      },
    };
    setPedido(este);
  }), []);
  return (
    <ConfirmCtx.Provider value={confirmar}>
      {children}
      {pedido && (
        <Modal title={pedido.titulo} onClose={() => pedido.responder(false)}>
          {pedido.texto && <p className="text-[14px] text-pimenta-2 leading-relaxed mt-0 mb-0">{pedido.texto}</p>}
          <div className="mt-5 flex flex-col-reverse md:flex-row md:justify-end gap-2">
            <GhostBtn onClick={() => pedido.responder(false)}>{pedido.cancelar || 'Cancelar'}</GhostBtn>
            <button
              autoFocus
              onClick={() => pedido.responder(true)}
              className={`pressionar flex items-center justify-center px-4 min-h-[44px] md:min-h-[40px] rounded-xl text-sm font-semibold text-white border-none cursor-pointer ${pedido.perigo ? 'bg-erro hover:bg-[#962019]' : 'bg-urucum hover:bg-urucum-dark'}`}
            >
              {pedido.acao}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

export const useConfirmar = () => useContext(ConfirmCtx);

/* ============ Formulário ============ */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12.5px] font-semibold text-pimenta-2 mb-1.5 mt-3">{children}</label>;
}

export const inputClass =
  'w-full px-3 py-2.5 md:py-2 rounded-lg border border-borda text-[16px] md:text-sm bg-white focus:outline-none focus:border-urucum focus:ring-1 focus:ring-urucum transition-colors';

/** Converte "12,50" ou "12.50" para número. */
export function parseValor(v: string) {
  if (v === '' || v == null) return NaN;
  const s = String(v).trim().replace(/\s/g, '');
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(normal);
}

export function MoneyInput({ value, onChange, placeholder = '0,00', autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-pimenta-3">R$</span>
      <input
        className={`${inputClass} pl-9 tabular-nums`}
        inputMode="decimal"
        enterKeyHint="next"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      />
    </div>
  );
}

/* ============ Toast ============ */
type ToastMsg = { id: number; text: string; tone: 'ok' | 'erro'; saindo?: boolean };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'erro') => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msgs, setMsgs] = useState<ToastMsg[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random();
    setMsgs((m) => [...m, { id, text, tone }]);
    // Marca a saída (anima) e só então remove
    setTimeout(() => {
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, saindo: true } : x)));
      setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 180);
    }, tone === 'erro' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        role="status" aria-live="polite"
        className="fixed z-[60] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[min(92vw,420px)] pointer-events-none"
      >
        {msgs.map((m) => (
          <div key={m.id} className={`toast flex items-start gap-2 px-4 py-3 rounded-xl shadow-[0_12px_32px_-12px_rgba(58,35,24,0.55)] text-sm font-medium ${m.saindo ? 'saindo' : ''} ${m.tone === 'ok' ? 'bg-pimenta text-white' : 'bg-erro text-white'}`}>
            {m.tone === 'ok' ? <CheckCircle2 size={17} className="shrink-0 mt-px" /> : <AlertCircle size={17} className="shrink-0 mt-px" />}
            <span>{m.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
