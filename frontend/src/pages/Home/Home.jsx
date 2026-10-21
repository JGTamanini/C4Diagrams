import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Check, Layers, Shapes, Sparkles, CloudUpload } from 'lucide-react';
import { hasActiveSession } from '../../services/session';
import { NODE_TYPES } from '../../constants/diagramNodeTypes';
import { C4_ELEMENTS, LEVELS } from '../../constants/c4Notation';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
import Brand from '../../components/Brand/Brand';
import { buttonClasses } from '../../components/Button/buttonStyles';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

const heroNodes = [
  { x: 75, y: 0, label: 'Person', sublabel: 'Engenheiro', ...NODE_TYPES.person },
  { x: 20, y: 70, label: 'Web App', sublabel: '[Container]', ...NODE_TYPES.container },
  { x: 165, y: 70, label: 'API', sublabel: '[Container]', ...NODE_TYPES.container },
  { x: 90, y: 140, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
  { x: 250, y: 30, label: 'Serviço IA', sublabel: '[Externo]', ...NODE_TYPES.external },
];

const heroConnections = [
  { x1: 118, y1: 45, x2: 128, y2: 85, color: 'var(--color-line)' },
  { x1: 70, y1: 118, x2: 130, y2: 128, color: 'var(--color-line)' },
  { x1: 215, y1: 118, x2: 190, y2: 128, color: 'var(--color-line)' },
  { x1: 130, y1: 190, x2: 130, y2: 214, color: 'var(--color-line)' },
];

const STEPS = [
  { title: 'Crie um projeto', text: 'Dê um nome e uma descrição ao sistema que você vai documentar.' },
  { title: 'Desenhe o contexto', text: 'Arraste pessoas e sistemas para o canvas e conecte-os com relações rotuladas.' },
  { title: 'Detalhe os níveis', text: 'Desça para containers e componentes e mantenha o modelo coerente do começo ao fim.' },
];

// Aparece suavemente ao entrar na área visível (uma vez só)
function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT_SOFT }}
    >
      {children}
    </motion.div>
  );
}

function PrimaryCallToAction({ loggedIn, size = 'md' }) {
  if (loggedIn) {
    return (
      <Link to="/projetos" className={buttonClasses({ size })}>
        Ir para meus projetos
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <Link to="/cadastro" className={buttonClasses({ size })}>
      Começar agora
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

// Miniaturas das funcionalidades: pequenas cenas com a própria linguagem visual do editor
function LevelsPreview() {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {LEVELS.map((level, index) => (
        <span
          key={level.id}
          className={`rounded-md px-2.5 py-1 text-[11px] ${index === 1 ? 'bg-accent text-white' : 'bg-surface-raised text-text-secondary'}`}
        >
          {level.label}
        </span>
      ))}
    </div>
  );
}

function NotationPreview() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {['c4-person', 'c4-system', 'c4-container', 'c4-system-external'].map((type) => (
        <span
          key={type}
          className={`h-6 w-9 border ${C4_ELEMENTS[type].shape === 'person' ? 'rounded-full' : 'rounded-md'}`}
          style={{ backgroundColor: C4_ELEMENTS[type].background, borderColor: C4_ELEMENTS[type].border }}
        />
      ))}
    </div>
  );
}

function AutosavePreview() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[11px] text-success">
      <Check className="h-3.5 w-3.5" />
      Todas as alterações salvas
    </span>
  );
}

function AssistantPreview() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1.5 rounded-full bg-highlight/15 px-3 py-1 text-[11px] text-highlight-text">
      <Sparkles className="h-3.5 w-3.5" />
      Que tal um banco de dados para a API?
    </span>
  );
}

const FEATURES = [
  {
    icon: Layers,
    title: 'Três níveis, um só modelo',
    text: 'Contexto, Container e Componente ficam juntos no mesmo projeto. Troque de nível com um clique e detalhe o sistema aos poucos.',
    preview: LevelsPreview,
  },
  {
    icon: Shapes,
    title: 'Notação C4 oficial',
    text: 'Pessoas, sistemas, containers e componentes com as cores, as formas e a legenda definidas no c4model.com.',
    preview: NotationPreview,
  },
  {
    icon: CloudUpload,
    title: 'Salvamento automático',
    text: 'Cada alteração é salva em segundos. Feche a aba sem medo: o diagrama continua de onde parou.',
    preview: AutosavePreview,
  },
  {
    icon: Sparkles,
    title: 'Assistência de IA',
    text: 'Sugestões de elementos e relações, e validação da estrutura enquanto você modela.',
    preview: AssistantPreview,
    soon: true,
  },
];

// Nota: página de apresentação — destaque com ilustração, funcionalidades e passos que aparecem ao rolar
function Home() {
  const loggedIn = hasActiveSession();

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas font-sans">
      <header className="sticky top-0 z-20 border-b border-line-subtle bg-canvas/80 backdrop-blur-md">
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
        <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-16 md:min-h-[calc(100vh-73px)] md:grid-cols-[1.05fr_1fr] md:py-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT_SOFT }}
            className="flex flex-col gap-6"
          >
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-highlight" aria-hidden="true" />
              Modelagem C4 guiada
            </span>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-text-primary md:text-5xl">
              Arquitetura de software clara,{' '}
              <span className="bg-linear-to-r from-accent-text to-highlight-text bg-clip-text text-transparent">
                do contexto ao componente
              </span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-text-secondary">
              Monte seus diagramas C4 no navegador com a notação oficial, organize os três níveis em um só projeto e conte
              com validação e assistência de IA para evoluir o modelo.
            </p>

            <div className="flex flex-wrap gap-3">
              <PrimaryCallToAction loggedIn={loggedIn} />
              <a href="#como-funciona" className={buttonClasses({ variant: 'secondary' })}>
                Como funciona
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT_SOFT }}
            className="relative h-80 md:h-[460px]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-0 rounded-full bg-[radial-gradient(closest-side,rgb(47_107_255/0.18),transparent)] blur-2xl"
            />
            <DiagramIllustration nodes={heroNodes} connections={heroConnections} fade="radial" />
          </motion.div>
        </section>

        <section aria-labelledby="funcionalidades" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="mb-12 max-w-2xl">
            <h2 id="funcionalidades" className="text-3xl font-semibold tracking-tight text-text-primary">
              Tudo o que um diagrama C4 precisa
            </h2>
            <p className="mt-3 text-text-secondary">
              Sem configurar formas, cores ou legendas: o C4Diagrams cuida da notação para você focar na arquitetura.
            </p>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text, preview: Preview, soon }, index) => (
              <Reveal key={title} delay={index * 0.06}>
                <article className="group flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent-text/40">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-accent/12 text-accent-text transition-colors duration-200 group-hover:bg-accent/20">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    {soon && (
                      <span className="rounded-full bg-highlight/15 px-2.5 py-0.5 text-xs font-medium text-highlight-text">
                        Em breve
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{text}</p>
                  </div>
                  <div className="mt-auto pt-2">
                    <Preview />
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <Reveal className="mb-12 max-w-2xl">
            <h2 id="como-funciona-titulo" className="text-3xl font-semibold tracking-tight text-text-primary">
              Como funciona
            </h2>
            <p className="mt-3 text-text-secondary">Do primeiro rascunho ao modelo completo em três passos.</p>
          </Reveal>

          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Reveal delay={index * 0.08} className="h-full">
                  <div className="h-full rounded-[var(--radius-card)] border border-line-subtle bg-surface/60 p-6">
                    <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-accent to-highlight font-mono text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{step.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface px-8 py-12 text-center">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(139_92_246/0.18),transparent_60%)]"
              />
              <div className="relative flex flex-col items-center gap-5">
                <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
                  Pronto para documentar sua arquitetura?
                </h2>
                <PrimaryCallToAction loggedIn={loggedIn} />
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line-subtle">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-text-muted sm:flex-row">
          <Brand className="" />
          <span>Projeto de Trabalho de Conclusão de Curso · 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default Home;
