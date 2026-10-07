import { useState } from 'react';
import { Store, KeyRound, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { traduzErro } from '../lib/data';
import { inputClass } from './ui';

export type Mode = 'login' | 'dono' | 'convite' | 'esqueci';

export default function AuthScreen({ inicial = 'login', onVoltar }: { inicial?: Mode; onVoltar?: () => void }) {
  const [mode, setMode] = useState<Mode>(inicial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [restaurante, setRestaurante] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoNome, setCodigoNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const trocar = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  const checarCodigo = async (c: string) => {
    setCodigo(c.toUpperCase());
    setCodigoNome(null);
    if (c.trim().length === 6) {
      const { data } = await supabase.rpc('validar_convite', { p_codigo: c.trim() });
      setCodigoNome((data as string) || '');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) return setError('Informe o e-mail.');
    if (mode !== 'esqueci') {
      if (!password) return setError('Informe a senha.');
      if (mode !== 'login' && password.length < 6) return setError('A senha deve ter ao menos 6 caracteres.');
    }
    if (mode === 'dono' && !restaurante.trim()) return setError('Informe o nome do restaurante.');
    if (mode === 'convite') {
      if (codigo.trim().length !== 6) return setError('O código de convite tem 6 caracteres.');
      if (!codigoNome) return setError('Código de convite inválido. Peça um novo código ao dono do restaurante.');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else if (mode === 'esqueci') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (err) throw err;
        setInfo('Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.');
      } else {
        const meta = mode === 'dono'
          ? { nome: nome.trim(), restaurante: restaurante.trim() }
          : { nome: nome.trim(), codigo_convite: codigo.trim().toUpperCase() };
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: meta } });
        if (err) throw err;
        if (!data.session) {
          setInfo('Cadastro criado! Confirme seu e-mail pelo link que enviamos e depois entre com sua senha.');
        }
      }
    } catch (err: unknown) {
      setError(traduzErro(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const tabBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => trocar(m)}
      className={`flex-1 py-2 rounded-md text-[13px] font-semibold border-none cursor-pointer transition-colors ${mode === m ? 'bg-white text-pimenta shadow-sm' : 'bg-transparent text-pimenta-3'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-pele flex items-center justify-center font-sans text-pimenta px-4 py-10">
      <div className="w-full max-w-[420px]">
        {onVoltar && (
          <button onClick={onVoltar} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pimenta-3 hover:text-pimenta bg-transparent border-none cursor-pointer p-0">
            <ArrowLeft size={15} /> Voltar
          </button>
        )}
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-urucum text-white flex items-center justify-center mx-auto mb-3"><Store size={26} /></div>
          <div className="font-display text-[28px] font-bold text-pimenta leading-tight">Painel do Restaurante</div>
          <p className="text-[13.5px] text-pimenta-3 mt-1">Caixa, fechamento, estoque e contas num só lugar</p>
        </div>

        <div className="bg-white rounded-xl border border-borda p-5 md:p-6 shadow-sm">
          {mode !== 'esqueci' && (
            <div className="flex gap-1 mb-5 bg-pele rounded-lg p-1">
              {tabBtn('login', 'Entrar')}
              {tabBtn('dono', 'Testar grátis')}
              {tabBtn('convite', 'Tenho convite')}
            </div>
          )}
          {mode === 'esqueci' && (
            <div className="mb-4">
              <div className="font-display text-[19px] font-bold text-pimenta flex items-center gap-2"><Mail size={18} /> Recuperar senha</div>
              <p className="text-[13px] text-pimenta-3 mt-1 mb-0">Enviaremos um link para você criar uma nova senha.</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {(mode === 'dono' || mode === 'convite') && (
              <Field label="Seu nome">
                <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Ana Souza" autoComplete="name" />
              </Field>
            )}
            {mode === 'dono' && (
              <Field label="Nome do restaurante">
                <input className={inputClass} value={restaurante} onChange={(e) => setRestaurante(e.target.value)} placeholder="Ex: Cantina da Ana" />
              </Field>
            )}
            {mode === 'convite' && (
              <Field label="Código de convite">
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pimenta-3" />
                  <input className={`${inputClass} pl-9 tabular-nums tracking-[0.3em] uppercase`} maxLength={6} value={codigo} onChange={(e) => checarCodigo(e.target.value)} placeholder="ABC123" />
                </div>
                {codigoNome && <div className="text-[12.5px] text-louro mt-1.5 font-semibold">✓ {codigoNome}</div>}
                {codigoNome === '' && <div className="text-[12.5px] text-erro mt-1.5">Código não encontrado.</div>}
                {codigoNome === null && <div className="text-[12px] text-pimenta-3 mt-1.5">Peça o código ao dono do restaurante.</div>}
              </Field>
            )}
            <Field label="E-mail">
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" />
            </Field>
            {mode !== 'esqueci' && (
              <Field label="Senha">
                <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Sua senha' : 'mínimo 6 caracteres'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </Field>
            )}

            {error && <div className="text-[12.5px] text-erro bg-erro-bg px-3 py-2 rounded-md">{error}</div>}
            {info && <div className="text-[12.5px] text-louro bg-louro-bg px-3 py-2 rounded-md">{info}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-urucum text-white border-none px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer hover:bg-urucum-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'esqueci' ? 'Enviar link' : mode === 'dono' ? 'Criar conta do restaurante' : 'Entrar na equipe'}
            </button>
          </form>

          <div className="mt-4 text-center text-[12.5px]">
            {mode === 'login' && (
              <button onClick={() => trocar('esqueci')} className="bg-transparent border-none text-pimenta-3 hover:text-pimenta cursor-pointer underline">Esqueci minha senha</button>
            )}
            {mode === 'esqueci' && (
              <button onClick={() => trocar('login')} className="bg-transparent border-none text-pimenta-3 hover:text-pimenta cursor-pointer underline">Voltar para o login</button>
            )}
            {mode === 'dono' && (
              <p className="text-[11.5px] text-pimenta-3 m-0 leading-relaxed">
                Seu teste grátis de 15 dias começa na hora. Sem cartão de crédito.
              </p>
            )}
            {mode === 'convite' && (
              <p className="text-[11.5px] text-pimenta-3 m-0 leading-relaxed">
                O dono do restaurante precisa aprovar seu acesso depois do cadastro.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12.5px] font-semibold text-pimenta-2 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
