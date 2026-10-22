import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Check, Redo2, Save, Undo2 } from 'lucide-react';
import { hasActiveSession } from '../../services/session';
import Brand from '../../components/Brand/Brand';
import { buttonClasses } from '../../components/Button/buttonStyles';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

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
    text: 'O diagrama é salvo automaticamente segundos depois de cada mudança. Errou? Desfaça e refaça com Ctrl+Z e Ctrl+Y.',
    visual: 'toolbar',
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
function ToolbarPreview() {
  return (
    <div
      role="img"
      aria-label="Barra do editor com desfazer, refazer e o aviso Todas as alterações salvas"
      className="pointer-events-none flex select-none flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-canvas-deep px-6 py-8 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]"
    >
      <div className="flex items-center gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-1 text-text-secondary">
        <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-surface-raised text-text-primary">
          <Undo2 aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="flex h-9 w-9 items-center justify-center">
          <Redo2 aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-success">
          <Check aria-hidden="true" className="h-4 w-4" />
          Todas as alterações salvas
        </span>
        <span className={buttonClasses({ size: 'sm' })}>
          <Save aria-hidden="true" className="h-4 w-4" />
          Salvar
        </span>
      </div>
    </div>
  );
}

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
        <section className="relative flex min-h-[calc(100svh-65px)] items-center bg-[radial-gradient(var(--color-line-subtle)_1px,transparent_1px)] bg-size-[22px_22px]">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
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

        <section aria-labelledby="funcionalidades" className="border-y border-line bg-surface">
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
                  {feature.visual === 'toolbar' ? <ToolbarPreview /> : <Screenshot image={feature.image} />}
                </Reveal>
              ))}

              <Reveal className="border-t border-line pt-10">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="text-2xl font-semibold tracking-tight text-text-primary">Assistência de IA</h3>
                  <span className="text-sm font-medium text-highlight-text">Em breve</span>
                </div>
                <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">
                  Sugestões de elementos e relações, e validação da estrutura enquanto você modela.
                </p>
              </Reveal>
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

        <section className="border-y border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              Pronto para documentar sua arquitetura?
            </h2>
            <PrimaryCallToAction loggedIn={loggedIn} />
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-text-muted sm:flex-row">
          <Brand className="" />
          <span>Projeto de Trabalho de Conclusão de Curso · 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
