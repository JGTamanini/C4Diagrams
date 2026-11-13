import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { hasActiveSession } from '../../services/session';
import Brand from '../../components/Brand/Brand';
import { buttonClasses } from '../../components/Button/buttonStyles';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Faixas com fundo próprio que entram e saem em degradê a partir do fundo da página: a seção continua se
// destacando, sem a linha dura entre uma e outra
const BAND_FADE_IN_OUT =
  'bg-[linear-gradient(to_bottom,var(--color-canvas),var(--color-surface)_180px,var(--color-surface)_calc(100%_-_180px),var(--color-canvas))]';
const BAND_FADE_IN = 'bg-[linear-gradient(to_bottom,var(--color-canvas),var(--color-surface)_160px)]';

// Capturas reais do editor (public/screens): mostrar o produto em vez de ilustrações genéricas
const FEATURES = [
  {
    title: 'Os elementos certos em cada nível',
    text: 'A paleta mostra só o que cabe no nível aberto: pessoas e sistemas no Contexto, containers e bancos de dados no Container, componentes no Componente. Arraste para o canvas e conecte.',
    image: { src: '/screens/paleta.jpg', alt: 'Paleta de elementos do nível Container ao lado do canvas com um diagrama', width: 1440, height: 840 },
  },
  {
    title: 'Notação C4 oficial, com legenda',
    text: 'Cores, formas e rótulos seguem o c4model.com: cada elemento mostra o tipo e a tecnologia, cada relação tem rótulo, e a legenda acompanha o diagrama.',
    image: { src: '/screens/notacao.jpg', alt: 'Container, banco de dados e sistema externo conectados, com a legenda do diagrama', width: 1260, height: 780 },
  },
  {
    title: 'Salvo a cada alteração',
    text: 'O diagrama é salvo automaticamente segundos depois de cada mudança, e o check verde na barra confirma. Errou? Desfaça e refaça com Ctrl+Z e Ctrl+Y. Com o projeto aberto em duas abas, uma não apaga o que a outra salvou.',
    image: {
      src: '/screens/salvamento.jpg',
      alt: 'Barra do editor com desfazer, refazer, o check de alterações salvas e o menu com Salvar, Compartilhar e exportações',
      width: 940,
      height: 420,
    },
  },
  {
    title: 'Assistente com validação e IA',
    text: 'O assistente confere a estrutura do diagrama enquanto você modela e aponta o que corrigir. Quando quiser, peça sugestões à IA: cada uma passa pela mesma validação antes de aparecer, e nada entra no diagrama sem você.',
    image: {
      src: '/screens/assistente.jpg',
      alt: 'Diagrama de containers com o assistente aberto na aba Sugestões, mostrando sugestões da IA',
      width: 1260,
      height: 780,
    },
  },
];

const STEPS = [
  { title: 'Crie um projeto', text: 'Dê um nome e uma descrição ao sistema que você vai documentar.' },
  { title: 'Desenhe o contexto', text: 'Arraste pessoas e sistemas para o canvas e conecte-os com relações rotuladas.' },
  { title: 'Detalhe os níveis', text: 'Desça para containers e componentes e mantenha o modelo coerente do começo ao fim.' },
];

// Aparece ao entrar na área visível (uma vez só), sem exageros
function Reveal({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, ease: EASE_OUT_SOFT }}
    >
      {children}
    </motion.div>
  );
}

function PrimaryCallToAction({ loggedIn }) {
  return (
    <Link to={loggedIn ? '/projetos' : '/cadastro'} className={buttonClasses()}>
      {loggedIn ? 'Ir para meus projetos' : 'Começar agora'}
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

// Moldura simples de janela para as capturas do produto
function Screenshot({ image, className = '' }) {
  return (
    <figure className={`overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas-deep shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] ${className}`}>
      <img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full select-none"
        draggable={false}
      />
    </figure>
  );
}

// Réplica nítida da barra do editor (mesmos ícones e estilos), só ilustrativa: uma captura de uma faixa tão larga
// ficaria ilegível reduzida
// Nota: página de apresentação — mostra o produto real (capturas do editor) em vez de ilustrações e efeitos genéricos
function Home() {
  const loggedIn = hasActiveSession();

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas font-sans">
      <header className="sticky top-0 z-20 border-b border-line-subtle bg-canvas/85 backdrop-blur-md">
        <nav aria-label="Principal" className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand className="" />
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Link to="/projetos" className={buttonClasses({ size: 'sm' })}>
                Ir para meus projetos
              </Link>
            ) : (
              <>
                <Link to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Entrar
                </Link>
                <Link to="/cadastro" className={buttonClasses({ size: 'sm' })}>
                  Começar agora
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Seções em faixas de fundo alternadas, para cada uma ser lida como um bloco */}
        <section className="relative flex min-h-[calc(100svh-65px)] items-center">
          {/* Grade de pontos que some aos poucos em direção à próxima seção */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-line-subtle)_1px,transparent_1px)] bg-size-[22px_22px] [mask-image:linear-gradient(to_bottom,black_50%,transparent)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT_SOFT }}
              className="max-w-3xl"
            >
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-text-primary md:text-[3.4rem]">
                Arquitetura de software clara, do contexto ao componente
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
                Monte seus diagramas C4 no navegador com a notação oficial, organize os três níveis em um só projeto e conte
                com validação e assistência de IA para evoluir o modelo.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryCallToAction loggedIn={loggedIn} />
                <a href="#como-funciona" className={buttonClasses({ variant: 'secondary' })}>
                  Como funciona
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <section aria-labelledby="funcionalidades" className={BAND_FADE_IN_OUT}>
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 id="funcionalidades" className="text-3xl font-semibold tracking-tight text-text-primary">
              O que o C4Diagrams faz por você
            </h2>
            <div className="mt-14 flex flex-col gap-24">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} className="grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
                  <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                    <h3 className="text-2xl font-semibold tracking-tight text-text-primary">{feature.title}</h3>
                    <p className="mt-3 leading-relaxed text-text-secondary">{feature.text}</p>
                  </div>
                  <Screenshot image={feature.image} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 id="como-funciona-titulo" className="text-3xl font-semibold tracking-tight text-text-primary">
              Como funciona
            </h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="border-t border-line pt-5">
                  <span className="font-mono text-sm text-text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 text-lg font-semibold text-text-primary">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={BAND_FADE_IN}>
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              Pronto para documentar sua arquitetura?
            </h2>
            <PrimaryCallToAction loggedIn={loggedIn} />
          </div>
        </section>
      </main>

      <footer className="bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-text-muted sm:flex-row">
          <Brand className="" />
          <span>Projeto de Trabalho de Conclusão de Curso · 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
