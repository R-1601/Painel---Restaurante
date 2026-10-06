import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

/* ============ Layout ============ */
export function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="font-serif text-[24px] md:text-[28px] font-bold text-green-dark leading-tight m-0">{children}</h1>
      {subtitle && <p className="text-[14px] text-[#6B6355] mt-1 mb-0">{subtitle}</p>}
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
  return <div className={`bg-white border border-card-border rounded-lg ${className}`}>{children}</div>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-card-border rounded-lg overflow-x-auto">
      {children}
    </div>
  );
}

export function EmptyState({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="py-10 px-4 text-center text-[#9A9280] text-sm">
      {text}
      {children && <div className="mt-3 flex justify-center">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, color, small }: { label: string; value: string; hint?: React.ReactNode; color?: string; small?: boolean }) {
  return (
    <div className="bg-white border border-card-border rounded-lg p-4">
      <div className="text-[11.5px] uppercase tracking-wide text-[#8A8270] font-semibold">{label}</div>
      <div className={`font-mono font-semibold mt-1 ${small ? 'text-[17px]' : 'text-[20px] md:text-[22px]'}`} style={{ color: color || '#20291F' }}>{value}</div>
      {hint && <div className="text-[12px] text-[#8A8270] mt-1">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'green' | 'red' | 'gold' | 'neutral' }) {
  const tones = {
    green: 'bg-teal-bg text-teal',
    red: 'bg-red-bg text-red',
    gold: 'bg-[#F5E9C8] text-[#8A6D1E]',
    neutral: 'bg-paper text-[#6B6355]',
  };
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/* ============ Botões ============ */
export function IconBtn({ onClick, color, children, title }: { onClick: () => void; color?: string; children: React.ReactNode; title?: string }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="bg-transparent border-none cursor-pointer p-1.5 flex rounded hover:bg-paper transition-colors" style={{ color: color || '#9A9280' }}>
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
      className={`flex items-center justify-center gap-1.5 bg-green text-[#F2EFE4] border-none px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${full ? 'w-full' : ''}`}
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
      className="flex items-center gap-1.5 bg-white text-ink border border-card-border px-3.5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-paper transition-colors disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 bg-white border border-card-border rounded-lg p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-md text-[13px] font-semibold border-none cursor-pointer transition-colors ${value === o.id ? 'bg-green text-[#F2EFE4]' : 'bg-transparent text-[#5A5344] hover:bg-paper'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ============ Tabela ============ */
export function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`${right ? 'text-right' : 'text-left'} px-3 py-2.5 text-xs text-[#8A8270] uppercase tracking-wide border-b border-paper-line whitespace-nowrap`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={`px-3 py-3 text-sm border-b border-paper-line ${className}`} style={style}>{children}</td>;
}

/* ============ Formulário ============ */
export function Modal({ title, onClose, children, width = 400 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-[rgba(20,30,25,0.45)] flex items-end md:items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-2xl md:rounded-xl p-5 md:p-6 overflow-y-auto shadow-2xl w-full" style={{ maxWidth: width, maxHeight: '90vh' }}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="m-0 font-serif text-[19px] text-green-dark">{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="bg-transparent border-none cursor-pointer text-[#8A8270] p-1">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12.5px] font-semibold text-[#5A5344] mb-1.5 mt-3">{children}</label>;
}

export const inputClass =
  'w-full px-3 py-2.5 md:py-2 rounded-md border border-card-border text-[16px] md:text-sm bg-[#FCFAF4] focus:outline-none focus:border-green focus:ring-1 focus:ring-green transition-colors';

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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8270]">R$</span>
      <input
        className={`${inputClass} pl-9 font-mono`}
        inputMode="decimal"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      />
    </div>
  );
}

/* ============ Toast ============ */
type ToastMsg = { id: number; text: string; tone: 'ok' | 'erro' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'erro') => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msgs, setMsgs] = useState<ToastMsg[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random();
    setMsgs((m) => [...m, { id, text, tone }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), tone === 'erro' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed z-[60] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[min(92vw,420px)] pointer-events-none">
        {msgs.map((m) => (
          <div key={m.id} className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${m.tone === 'ok' ? 'bg-green text-[#F2EFE4]' : 'bg-red text-white'}`}>
            {m.tone === 'ok' ? <CheckCircle2 size={17} className="shrink-0 mt-px" /> : <AlertCircle size={17} className="shrink-0 mt-px" />}
            <span>{m.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
