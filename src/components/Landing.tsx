import { useEffect, useRef } from 'react';
import { Store, Lock, Percent, CalendarClock, PackageX, Smartphone, Users, ShieldCheck, MessageCircle, Check, ChevronDown } from 'lucide-react';
import telaResumo from '../assets-tela-resumo.jpg';
import telaFechamento from '../assets-tela-fechamento.jpg';
import telaRelatorios from '../assets-tela-relatorios.jpg';

const WHATSAPP = (import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined)?.replace(/\D/g, '');
const PRECO = Number(import.meta.env.VITE_PRECO_MENSAL || 29);
const DIAS_GRATIS = 15;
const linkWhats = WHATSAPP
  ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Vi o Painel do Restaurante e quero saber mais.')}`
  : null;

const wrap = 'max-w-[1120px] mx-auto px-4 md:px-6';
const h2 = 'font-display font-normal text-[32px] md:text-[44px] leading-[1.02] text-pimenta m-0';

// Botões grandes: afundam ao pressionar (classe .pressionar no index.css)
const btnBase = 'pressionar inline-flex items-center justify-center gap-2 px-6 min-h-[52px] rounded-xl text-[16px] font-semibold cursor-pointer no-underline';

export default function Landing({ onEntrar, onCadastrar }: { onEntrar: () => void; onCadastrar: () => void }) {
  const topoRef = useRef<HTMLElement>(null);
  const celularRef = useRef<HTMLDivElement>(null);
  useInclinacao(topoRef, celularRef);

  return (
    <div className="bg-pele min-h-screen text-pimenta font-sans">
      {/* Topo */}
      <header className="sticky top-0 z-30 bg-pele/95 backdrop-blur border-b border-borda">
        <div className={`${wrap} h-16 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-urucum text-white flex items-center justify-center shrink-0"><Store size={18} /></div>
            {/* No celular o nome vira um selo de duas linhas, para caber os dois botões */}
            <span className="font-display text-[15px] leading-[1.05] sm:text-[19px] sm:leading-normal text-pimenta">
              Painel do <br className="sm:hidden" />Restaurante
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button onClick={onEntrar} className="pressionar min-h-[44px] px-3 sm:px-4 rounded-xl text-sm font-semibold text-pimenta bg-transparent border border-borda cursor-pointer hover:bg-white whitespace-nowrap">Entrar</button>
            <button onClick={onCadastrar} className="pressionar min-h-[44px] px-3.5 sm:px-4 rounded-xl text-sm font-semibold text-white bg-urucum border-none cursor-pointer hover:bg-urucum-dark whitespace-nowrap">Testar grátis</button>
          </div>
        </div>
      </header>

      {/* Hero: faixa urucum com o app servido num prato */}
      <section ref={topoRef} className="foco-claro bg-urucum text-white overflow-hidden">
        <div className={`${wrap} pt-12 md:pt-16 pb-0 md:pb-16 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center`}>
          <div>
            <div className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-pimenta bg-acafrao px-3.5 py-1.5 rounded-full mb-5 md:mb-6">
              <Smartphone size={15} /> Funciona no celular, sem instalar nada
            </div>
            <h1 className="font-display font-normal text-[36px] leading-[1.04] sm:text-[44px] md:text-[64px] md:leading-[1.02] m-0">
              Saiba quanto seu restaurante lucra de verdade, todo dia.
            </h1>
            <p className="text-[17px] md:text-[19px] text-[#FFE9DA] leading-relaxed mt-4 md:mt-5 mb-7 md:mb-8 max-w-[520px]">
              Caixa, fechamento do dia, taxas do iFood e da maquininha, contas a pagar e estoque. Tudo num lugar só, sem planilha e sem caderno.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onCadastrar} className={`${btnBase} text-pimenta bg-acafrao border-none hover:bg-[#F5B53A]`}>
                Testar grátis por {DIAS_GRATIS} dias
              </button>
              {linkWhats && (
                <a href={linkWhats} target="_blank" rel="noreferrer" className={`${btnBase} text-white bg-transparent border border-white/50 hover:bg-white/10`}>
                  <MessageCircle size={18} /> Falar no WhatsApp
                </a>
              )}
            </div>
            <p className="text-[14px] text-[#FFE9DA] mt-4">Sem cartão de crédito. Depois do teste, só R$ {PRECO} por mês.</p>
          </div>
          <Prato>
            <div ref={celularRef} data-celular-topo className="will-change-transform">
              <Celular src={telaResumo} alt="Tela de resumo com vendas do dia, do mês e lucro" prioridade />
            </div>
          </Prato>
        </div>
      </section>

      {/* Dores */}
      <section className={`${wrap} py-16 md:py-24`}>
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <div>
            <h2 className={h2}>Chega de fechar o mês no escuro</h2>
            <p className="text-[17px] text-pimenta-2 leading-relaxed mt-4 mb-0 max-w-[420px]">O Painel resolve os problemas que todo dono de restaurante conhece.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-10">
            <Dor icon={Lock} titulo="Caixa que não bate" texto="No fim do dia você conta a gaveta e o Painel diz na hora se falta ou sobra dinheiro." />
            <Dor icon={Percent} titulo="Taxa que ninguém vê" texto="Veja quanto o iFood e a maquininha levaram no mês, em reais." />
            <Dor icon={CalendarClock} titulo="Conta esquecida" texto="Alerta de conta vencida e do que vence na semana. Aluguel e luz se repetem sozinhos." />
            <Dor icon={PackageX} titulo="Estoque que acaba" texto="Avisa quando um item chega no mínimo, antes de faltar no meio do serviço." />
          </div>
        </div>
      </section>

      {/* Destaque fechamento */}
      <section className="bg-white">
        <div className={`${wrap} py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center`}>
          <div className="order-2 md:order-1"><Prato cor="pele"><Celular src={telaFechamento} alt="Fechamento de caixa mostrando diferença de R$ 3,50" /></Prato></div>
          <div className="order-1 md:order-2">
            <h2 className={h2}>Feche o caixa em 2 minutos</h2>
            <p className="text-[17px] text-pimenta-2 leading-relaxed mt-4 max-w-[480px]">
              Informe o troco da abertura e o dinheiro contado no fim do dia. O Painel calcula quanto deveria ter na gaveta e mostra a diferença na hora.
            </p>
            <Lista itens={['Vendas do dia por forma de pagamento', 'Histórico de todos os fechamentos', 'Funciona no celular do caixa']} />
          </div>
        </div>
      </section>

      {/* Destaque relatórios */}
      <section className={`${wrap} py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center`}>
        <div>
          <h2 className={h2}>Entenda o seu movimento</h2>
          <p className="text-[17px] text-pimenta-2 leading-relaxed mt-4 max-w-[480px]">
            Vendas por dia, por canal e por forma de pagamento. Compare com o mês passado e descubra seus melhores dias da semana.
          </p>
          <Lista itens={['Lucro já descontando taxas e despesas', 'Ticket médio e comparativo com o período anterior', 'Exporta para planilha com um clique']} />
        </div>
        <Prato><Celular src={telaRelatorios} alt="Relatório com gráfico de vendas por dia" /></Prato>
      </section>

      {/* Como funciona */}
      <section className="bg-white">
        <div className={`${wrap} py-16 md:py-24`}>
          <h2 className={h2}>Comece hoje, em 3 passos</h2>
          <ol className="list-none p-0 m-0 mt-10 grid md:grid-cols-3 gap-8 md:gap-10">
            <Passo n={1} titulo="Crie sua conta" texto="Só o nome do restaurante, e-mail e senha. Leva 1 minuto." />
            <Passo n={2} titulo="Lance as vendas" texto="Toque em Venda, digite o valor e a forma de pagamento. 5 segundos." />
            <Passo n={3} titulo="Veja o lucro" texto="Resumo do dia e do mês, fechamento de caixa e contas a pagar." />
          </ol>
          <div className="grid sm:grid-cols-2 gap-4 mt-12">
            <Extra icon={Users} titulo="Equipe com acesso controlado" texto="Convide funcionários. Eles lançam vendas e fecham o caixa, sem ver o lucro." />
            <Extra icon={ShieldCheck} titulo="Seus dados são só seus" texto="Cada restaurante vê apenas os próprios dados, com acesso por senha." />
          </div>
        </div>
      </section>

      {/* Preço */}
      <section className="bg-pimenta text-white">
        <div className={`${wrap} py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center`}>
          <div>
            <h2 className="font-display font-normal text-[32px] md:text-[46px] leading-[1.02] m-0">Menos de R$ 1 por dia para saber o seu lucro</h2>
            <p className="text-[17px] text-sidebar-text leading-relaxed mt-4 max-w-[460px]">Teste {DIAS_GRATIS} dias grátis, sem cartão de crédito. Gostou? Continue por R$ {PRECO} por mês.</p>
          </div>
          <div className="bg-white text-pimenta rounded-3xl p-6 md:p-8 border-t-[6px] border-acafrao">
            <div className="text-[15px] font-semibold text-pimenta-2">Plano completo</div>
            <div className="flex items-end gap-1.5 mt-1">
              <span className="font-display text-[60px] text-urucum leading-none">R$ {PRECO}</span>
              <span className="text-[17px] text-pimenta-3 mb-2">por mês</span>
            </div>
            <Lista itens={['Caixa e fechamento do dia', 'Relatórios e taxas de pagamento', 'Contas a pagar com alertas', 'Controle de estoque', 'Funcionários sem custo extra', `${DIAS_GRATIS} dias grátis para testar`]} />
            <button onClick={onCadastrar} className={`${btnBase} w-full mt-7 text-white bg-urucum border-none hover:bg-urucum-dark`}>
              Começar teste grátis
            </button>
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="max-w-[760px] mx-auto px-4 md:px-6 py-16 md:py-24">
        <h2 className={`${h2} mb-8`}>Perguntas frequentes</h2>
        <div className="flex flex-col gap-3">
          <Pergunta p="Preciso instalar alguma coisa?" r="Não. O Painel funciona no navegador do celular ou do computador. É só entrar com seu e-mail e senha." />
          <Pergunta p="Meus funcionários podem usar?" r="Sim. Você convida pelo próprio Painel e aprova cada um. Funcionários lançam vendas, fecham o caixa e mexem no estoque, mas não veem relatórios nem contas." />
          <Pergunta p="Preciso de cartão de crédito para testar?" r={`Não. Você testa por ${DIAS_GRATIS} dias sem informar nenhum cartão.`} />
          <Pergunta p="Posso cancelar quando quiser?" r="Sim. Não tem fidelidade nem multa. Se não quiser continuar, é só não renovar." />
          <Pergunta p="Funciona para delivery e iFood?" r="Sim. Você registra vendas de balcão, salão, retirada e delivery, e o Painel desconta a taxa de cada forma de pagamento automaticamente." />
        </div>
      </section>

      {/* CTA final */}
      <section className={`${wrap} pb-16`}>
        <div className="foco-escuro bg-acafrao rounded-3xl p-6 sm:p-8 md:p-12">
          <h2 className="font-display font-normal text-[30px] md:text-[40px] leading-[1.05] text-pimenta m-0 max-w-[640px]">Comece hoje e feche o mês sabendo o seu lucro</h2>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <button onClick={onCadastrar} className={`${btnBase} text-white bg-urucum border-none hover:bg-urucum-dark`}>
              Testar grátis por {DIAS_GRATIS} dias
            </button>
            {linkWhats && (
              <a href={linkWhats} target="_blank" rel="noreferrer" className={`${btnBase} text-pimenta bg-white/70 border-none hover:bg-white`}>
                <MessageCircle size={18} /> Tirar dúvidas no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-borda py-8">
        <div className={`${wrap} flex flex-wrap justify-between items-center gap-3 text-[14px] text-pimenta-3`}>
          <span className="font-display text-[16px] text-pimenta">Painel do Restaurante</span>
          <button onClick={onEntrar} className="min-h-[44px] bg-transparent border-none text-pimenta-2 underline underline-offset-4 decoration-borda hover:decoration-pimenta-2 cursor-pointer px-0 font-sans text-[14px]">Já sou cliente</button>
        </div>
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

/** Prato atrás do celular: o app "servido" na mesa. */
function Prato({ children, cor = 'white' }: { children: React.ReactNode; cor?: 'white' | 'pele' }) {
  const prato = cor === 'white' ? 'bg-white border-[#F6D9C6]' : 'bg-pele border-borda';
  return (
    <div className="relative flex justify-center py-6">
      <div aria-hidden className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] md:w-[440px] md:h-[440px] rounded-full border-[18px] md:border-[24px] ${prato}`} />
      <div className="relative">{children}</div>
    </div>
  );
}

function Celular({ src, alt, prioridade }: { src: string; alt: string; prioridade?: boolean }) {
  return (
    <div className="w-[250px] md:w-[290px] rounded-[38px] bg-pimenta p-2.5 shadow-[0_28px_60px_-18px_rgba(58,35,24,0.55)]">
      <div className="rounded-[30px] overflow-hidden bg-pele aspect-[9/18]">
        <img src={src} alt={alt} width={600} height={1200} loading={prioridade ? 'eager' : 'lazy'} decoding="async"
          className="w-full h-full object-cover object-top block" />
      </div>
    </div>
  );
}

function Dor({ icon: Icon, titulo, texto }: { icon: typeof Lock; titulo: string; texto: string }) {
  return (
    <div className="flex gap-4 py-6 border-b border-borda">
      <div className="w-11 h-11 rounded-full bg-urucum-bg text-urucum flex items-center justify-center shrink-0"><Icon size={20} /></div>
      <div>
        <div className="font-semibold text-[18px] text-pimenta">{titulo}</div>
        <p className="text-[15.5px] text-pimenta-2 leading-relaxed mt-1 mb-0">{texto}</p>
      </div>
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="list-none p-0 mt-6 mb-0 space-y-3">
      {itens.map((i) => (
        <li key={i} className="flex items-start gap-3 text-[16px]">
          <span className="w-6 h-6 rounded-full bg-louro-bg text-louro flex items-center justify-center shrink-0"><Check size={14} strokeWidth={3} /></span>
          {i}
        </li>
      ))}
    </ul>
  );
}

function Passo({ n, titulo, texto }: { n: number; titulo: string; texto: string }) {
  return (
    <li className="border-t-[3px] border-urucum pt-4">
      <div className="font-display text-[56px] leading-none text-urucum">{n}</div>
      <div className="font-semibold text-[19px] text-pimenta mt-3">{titulo}</div>
      <p className="text-[15.5px] text-pimenta-2 leading-relaxed mt-1.5 mb-0 max-w-[320px]">{texto}</p>
    </li>
  );
}

function Extra({ icon: Icon, titulo, texto }: { icon: typeof Lock; titulo: string; texto: string }) {
  return (
    <div className="flex gap-4 bg-pele rounded-2xl p-5 md:p-6">
      <Icon size={24} className="text-louro shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-[16.5px] text-pimenta">{titulo}</div>
        <p className="text-[15px] text-pimenta-2 leading-relaxed mt-1 mb-0">{texto}</p>
      </div>
    </div>
  );
}

function Pergunta({ p, r }: { p: string; r: string }) {
  return (
    <details className="group bg-white rounded-2xl [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex justify-between items-center gap-3 cursor-pointer list-none px-5 md:px-6 py-4 md:py-5 font-semibold text-[16.5px] text-pimenta">
        {p} <ChevronDown size={20} className="shrink-0 text-urucum transition-transform group-open:rotate-180" />
      </summary>
      <p className="px-5 md:px-6 pb-5 m-0 text-[15.5px] text-pimenta-2 leading-relaxed max-w-[62ch]">{r}</p>
    </details>
  );
}

/** Ajuste da inclinação do celular do topo. */
const INCLINACAO = {
  MAX: 10, // graus
  ALCANCE: 240, // px do centro do celular até a inclinação máxima
  SEGUIR: 0.14, // quanto se aproxima do mouse a cada quadro (60 fps)
  VOLTAR: 0.07, // volta mais devagar quando o mouse sai do topo
};

/**
 * O celular do topo inclina em 3D acompanhando o mouse e volta devagar ao sair.
 * Atualiza a cada quadro, sem re-render do React. Só com mouse; parado no toque e com "reduzir movimento".
 */
function useInclinacao(areaRef: React.RefObject<HTMLElement>, alvoRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const area = areaRef.current;
    const alvo = alvoRef.current;
    if (!area || !alvo) return;
    const temMouse = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calmo = window.matchMedia('(prefers-reduced-motion: reduce)');
    const limitar = (v: number) => Math.max(-1, Math.min(1, v));
    let destinoX = 0, destinoY = 0, x = 0, y = 0, quadro = 0, anterior = 0;

    const passo = (agora: number) => {
      const dt = anterior ? Math.min(agora - anterior, 64) : 16.7;
      anterior = agora;
      const voltando = destinoX === 0 && destinoY === 0;
      const k = 1 - Math.pow(1 - (voltando ? INCLINACAO.VOLTAR : INCLINACAO.SEGUIR), dt / 16.7);
      x += (destinoX - x) * k;
      y += (destinoY - y) * k;
      if (Math.abs(destinoX - x) < 0.02 && Math.abs(destinoY - y) < 0.02) {
        x = destinoX; y = destinoY; quadro = 0; anterior = 0;
      } else {
        quadro = requestAnimationFrame(passo);
      }
      alvo.style.transform = x === 0 && y === 0 ? '' : `perspective(1100px) rotateX(${y.toFixed(2)}deg) rotateY(${x.toFixed(2)}deg)`;
    };
    const animar = () => { if (!quadro) quadro = requestAnimationFrame(passo); };

    const mover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !temMouse.matches || calmo.matches) return;
      // Centro medido no pai, que não inclina (a caixa do próprio celular muda com a rotação)
      const r = (alvo.parentElement || alvo).getBoundingClientRect();
      const nx = limitar((e.clientX - (r.left + r.width / 2)) / INCLINACAO.ALCANCE);
      const ny = limitar((e.clientY - (r.top + r.height / 2)) / INCLINACAO.ALCANCE);
      // O celular "olha" para o mouse: o lado mais perto do cursor se afasta
      destinoX = nx * INCLINACAO.MAX;
      destinoY = -ny * INCLINACAO.MAX;
      animar();
    };
    const sair = () => { destinoX = 0; destinoY = 0; animar(); };

    area.addEventListener('pointermove', mover);
    area.addEventListener('pointerleave', sair);
    return () => {
      area.removeEventListener('pointermove', mover);
      area.removeEventListener('pointerleave', sair);
      cancelAnimationFrame(quadro);
    };
  }, [areaRef, alvoRef]);
}
