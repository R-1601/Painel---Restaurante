import { Store, Lock, Percent, CalendarClock, PackageX, Smartphone, Users, ShieldCheck, MessageCircle, Check, ArrowRight, ChevronDown } from 'lucide-react';
import telaResumo from '../assets-tela-resumo.jpg';
import telaFechamento from '../assets-tela-fechamento.jpg';
import telaRelatorios from '../assets-tela-relatorios.jpg';

const WHATSAPP = (import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined)?.replace(/\D/g, '');
const PRECO = Number(import.meta.env.VITE_PRECO_MENSAL || 29);
const DIAS_GRATIS = 15;
const linkWhats = WHATSAPP
  ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Vi o Painel do Restaurante e quero saber mais.')}`
  : null;

export default function Landing({ onEntrar, onCadastrar }: { onEntrar: () => void; onCadastrar: () => void }) {
  return (
    <div className="bg-paper min-h-screen text-ink font-sans">
      {/* Topo */}
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-paper-line">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-green text-[#F2EFE4] flex items-center justify-center"><Store size={18} /></div>
            <span className="font-serif font-bold text-[18px] text-green-dark">Painel do Restaurante</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEntrar} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-green-dark bg-transparent border border-card-border cursor-pointer hover:bg-white">Entrar</button>
            <button onClick={onCadastrar} className="hidden sm:block px-3.5 py-2 rounded-lg text-sm font-semibold text-[#F2EFE4] bg-green border-none cursor-pointer hover:bg-green-dark">Testar grátis</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1120px] mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-14 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-teal bg-teal-bg px-3 py-1 rounded-full mb-5">
            <Smartphone size={14} /> Funciona no celular, sem instalar nada
          </div>
          <h1 className="font-serif text-[36px] leading-[1.08] md:text-[54px] font-bold text-green-dark m-0">
            Saiba quanto seu restaurante <span className="text-teal">lucra de verdade</span>, todo dia.
          </h1>
          <p className="text-[17px] md:text-[19px] text-[#4A4536] leading-relaxed mt-5 mb-7 max-w-[540px]">
            Caixa, fechamento do dia, taxas do iFood e da maquininha, contas a pagar e estoque. Tudo num lugar só, sem planilha e sem caderno.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onCadastrar} className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[16px] font-semibold text-[#F2EFE4] bg-green border-none cursor-pointer hover:bg-green-dark shadow-sm">
              Testar grátis por {DIAS_GRATIS} dias <ArrowRight size={18} />
            </button>
            {linkWhats && (
              <a href={linkWhats} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[16px] font-semibold text-green-dark bg-white border border-card-border no-underline hover:bg-teal-bg">
                <MessageCircle size={18} /> Falar no WhatsApp
              </a>
            )}
          </div>
          <p className="text-[13.5px] text-[#6B6355] mt-4">Sem cartão de crédito. Depois do teste, só R$ {PRECO} por mês.</p>
        </div>
        <Celular src={telaResumo} alt="Tela de resumo com vendas do dia, do mês e lucro" />
      </section>

      {/* Dores */}
      <section className="bg-white border-y border-paper-line">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-14 md:py-20">
          <h2 className="font-serif text-[28px] md:text-[38px] font-bold text-green-dark text-center m-0">Chega de fechar o mês no escuro</h2>
          <p className="text-center text-[16px] text-[#6B6355] mt-3 mb-10 max-w-[620px] mx-auto">O Painel resolve os problemas que todo dono de restaurante conhece.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Dor icon={Lock} titulo="Caixa que não bate" texto="No fim do dia você conta a gaveta e o Painel diz na hora se falta ou sobra dinheiro." />
            <Dor icon={Percent} titulo="Taxa que ninguém vê" texto="Veja quanto o iFood e a maquininha levaram no mês, em reais." />
            <Dor icon={CalendarClock} titulo="Conta esquecida" texto="Alerta de conta vencida e do que vence na semana. Aluguel e luz se repetem sozinhos." />
            <Dor icon={PackageX} titulo="Estoque que acaba" texto="Avisa quando um item chega no mínimo, antes de faltar no meio do serviço." />
          </div>
        </div>
      </section>

      {/* Destaque fechamento */}
      <section className="max-w-[1120px] mx-auto px-4 md:px-6 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1"><Celular src={telaFechamento} alt="Fechamento de caixa mostrando diferença de R$ 3,50" /></div>
        <div className="order-1 md:order-2">
          <Etiqueta>Fechamento de caixa</Etiqueta>
          <h2 className="font-serif text-[28px] md:text-[38px] font-bold text-green-dark m-0 leading-tight">Feche o caixa em 2 minutos</h2>
          <p className="text-[16.5px] text-[#4A4536] leading-relaxed mt-4">
            Informe o troco da abertura e o dinheiro contado no fim do dia. O Painel calcula quanto deveria ter na gaveta e mostra a diferença na hora.
          </p>
          <Lista itens={['Vendas do dia por forma de pagamento', 'Histórico de todos os fechamentos', 'Funciona no celular do caixa']} />
        </div>
      </section>

      {/* Destaque relatórios */}
      <section className="bg-white border-y border-paper-line">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Etiqueta>Relatórios</Etiqueta>
            <h2 className="font-serif text-[28px] md:text-[38px] font-bold text-green-dark m-0 leading-tight">Entenda o seu movimento</h2>
            <p className="text-[16.5px] text-[#4A4536] leading-relaxed mt-4">
              Vendas por dia, por canal e por forma de pagamento. Compare com o mês passado e descubra seus melhores dias da semana.
            </p>
            <Lista itens={['Lucro já descontando taxas e despesas', 'Ticket médio e comparativo com o período anterior', 'Exporta para planilha com um clique']} />
          </div>
          <Celular src={telaRelatorios} alt="Relatório com gráfico de vendas por dia" />
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-[1120px] mx-auto px-4 md:px-6 py-14 md:py-20">
        <h2 className="font-serif text-[28px] md:text-[38px] font-bold text-green-dark text-center m-0">Comece hoje, em 3 passos</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          <Passo n={1} titulo="Crie sua conta" texto="Só o nome do restaurante, e-mail e senha. Leva 1 minuto." />
          <Passo n={2} titulo="Lance as vendas" texto="Toque em Venda, digite o valor e a forma de pagamento. 5 segundos." />
          <Passo n={3} titulo="Veja o lucro" texto="Resumo do dia e do mês, fechamento de caixa e contas a pagar." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Extra icon={Users} titulo="Equipe com acesso controlado" texto="Convide funcionários. Eles lançam vendas e fecham o caixa, sem ver o lucro." />
          <Extra icon={ShieldCheck} titulo="Seus dados são só seus" texto="Cada restaurante vê apenas os próprios dados, com acesso por senha." />
        </div>
      </section>

      {/* Preço */}
      <section className="bg-green text-[#F2EFE4]">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-serif text-[28px] md:text-[40px] font-bold m-0 leading-tight">Menos de R$ 1 por dia para saber o seu lucro</h2>
            <p className="text-[16.5px] text-sidebar-text leading-relaxed mt-4">Teste {DIAS_GRATIS} dias grátis, sem cartão de crédito. Gostou? Continue por R$ {PRECO} por mês.</p>
          </div>
          <div className="bg-white text-ink rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-teal">Plano completo</div>
            <div className="flex items-end gap-1 mt-2">
              <span className="font-serif text-[52px] font-bold text-green-dark leading-none">R$ {PRECO}</span>
              <span className="text-[16px] text-[#6B6355] mb-1.5">/mês</span>
            </div>
            <Lista itens={['Caixa e fechamento do dia', 'Relatórios e taxas de pagamento', 'Contas a pagar com alertas', 'Controle de estoque', 'Funcionários sem custo extra', `${DIAS_GRATIS} dias grátis para testar`]} />
            <button onClick={onCadastrar} className="w-full mt-6 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[16px] font-semibold text-[#F2EFE4] bg-green border-none cursor-pointer hover:bg-green-dark">
              Começar teste grátis <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="max-w-[760px] mx-auto px-4 md:px-6 py-14 md:py-20">
        <h2 className="font-serif text-[28px] md:text-[36px] font-bold text-green-dark text-center m-0 mb-8">Perguntas frequentes</h2>
        <Pergunta p="Preciso instalar alguma coisa?" r="Não. O Painel funciona no navegador do celular ou do computador. É só entrar com seu e-mail e senha." />
        <Pergunta p="Meus funcionários podem usar?" r="Sim. Você convida pelo próprio Painel e aprova cada um. Funcionários lançam vendas, fecham o caixa e mexem no estoque, mas não veem relatórios nem contas." />
        <Pergunta p="Preciso de cartão de crédito para testar?" r={`Não. Você testa por ${DIAS_GRATIS} dias sem informar nenhum cartão.`} />
        <Pergunta p="Posso cancelar quando quiser?" r="Sim. Não tem fidelidade nem multa. Se não quiser continuar, é só não renovar." />
        <Pergunta p="Funciona para delivery e iFood?" r="Sim. Você registra vendas de balcão, salão, retirada e delivery, e o Painel desconta a taxa de cada forma de pagamento automaticamente." />
      </section>

      {/* CTA final */}
      <section className="max-w-[1120px] mx-auto px-4 md:px-6 pb-16">
        <div className="bg-white border border-card-border rounded-2xl p-8 md:p-12 text-center">
          <h2 className="font-serif text-[26px] md:text-[34px] font-bold text-green-dark m-0">Comece hoje e feche o mês sabendo o seu lucro</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
            <button onClick={onCadastrar} className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[16px] font-semibold text-[#F2EFE4] bg-green border-none cursor-pointer hover:bg-green-dark">
              Testar grátis por {DIAS_GRATIS} dias <ArrowRight size={18} />
            </button>
            {linkWhats && (
              <a href={linkWhats} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[16px] font-semibold text-green-dark bg-paper border border-card-border no-underline hover:bg-teal-bg">
                <MessageCircle size={18} /> Tirar dúvidas no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-paper-line py-8 text-center text-[13px] text-[#8A8270]">
        Painel do Restaurante · <button onClick={onEntrar} className="bg-transparent border-none text-[#6B6355] underline cursor-pointer p-0">Já sou cliente</button>
      </footer>

      {linkWhats && (
        <a href={linkWhats} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
          <MessageCircle size={26} />
        </a>
      )}
    </div>
  );
}

function Celular({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-[270px] md:w-[300px] rounded-[38px] bg-[#1b1f1d] p-2.5 shadow-2xl rotate-[1.5deg]">
      <div className="rounded-[30px] overflow-hidden bg-paper aspect-[9/18]">
        <img src={src} alt={alt} className="w-full h-full object-cover object-top block" />
      </div>
    </div>
  );
}

function Dor({ icon: Icon, titulo, texto }: { icon: typeof Lock; titulo: string; texto: string }) {
  return (
    <div className="bg-paper border border-paper-line rounded-xl p-5">
      <div className="w-10 h-10 rounded-lg bg-teal-bg text-teal flex items-center justify-center mb-3"><Icon size={20} /></div>
      <div className="font-semibold text-[16px] text-green-dark">{titulo}</div>
      <p className="text-[14.5px] text-[#5A5344] leading-relaxed mt-1.5 mb-0">{texto}</p>
    </div>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <div className="text-[12.5px] font-semibold uppercase tracking-wide text-teal mb-2">{children}</div>;
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="list-none p-0 mt-5 mb-0 space-y-2.5">
      {itens.map((i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px]">
          <span className="w-5 h-5 rounded-full bg-teal-bg text-teal flex items-center justify-center shrink-0 mt-0.5"><Check size={13} strokeWidth={3} /></span>
          {i}
        </li>
      ))}
    </ul>
  );
}

function Passo({ n, titulo, texto }: { n: number; titulo: string; texto: string }) {
  return (
    <div className="bg-white border border-card-border rounded-xl p-6">
      <div className="w-9 h-9 rounded-full bg-green text-[#F2EFE4] font-bold flex items-center justify-center mb-3">{n}</div>
      <div className="font-semibold text-[17px] text-green-dark">{titulo}</div>
      <p className="text-[14.5px] text-[#5A5344] leading-relaxed mt-1.5 mb-0">{texto}</p>
    </div>
  );
}

function Extra({ icon: Icon, titulo, texto }: { icon: typeof Lock; titulo: string; texto: string }) {
  return (
    <div className="flex gap-4 bg-teal-bg/60 rounded-xl p-5">
      <Icon size={22} className="text-teal shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-[15.5px] text-green-dark">{titulo}</div>
        <p className="text-[14px] text-[#5A5344] leading-relaxed mt-1 mb-0">{texto}</p>
      </div>
    </div>
  );
}

function Pergunta({ p, r }: { p: string; r: string }) {
  return (
    <details className="group bg-white border border-card-border rounded-xl mb-3 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex justify-between items-center gap-3 cursor-pointer list-none px-5 py-4 font-semibold text-[15.5px] text-green-dark">
        {p} <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="px-5 pb-4 m-0 text-[14.5px] text-[#5A5344] leading-relaxed">{r}</p>
    </details>
  );
}
