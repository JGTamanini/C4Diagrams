import { Link } from 'react-router-dom';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';

const homeNodes = [
  { x: 75, y: 0, label: 'Person', sublabel: 'Engenheiro', borderColor: '#F0F6FC', labelColor: '#F0F6FC' },
  { x: 20, y: 70, label: 'Web App', sublabel: '[Container]', borderColor: '#58A6FF', labelColor: '#58A6FF' },
  { x: 165, y: 70, label: 'API', sublabel: '[Container]', borderColor: '#58A6FF', labelColor: '#58A6FF' },
  { x: 90, y: 140, label: 'Database', sublabel: '[Container]', borderColor: '#3FB950', labelColor: '#3FB950' },
  { x: 250, y: 30, label: 'Serviço IA', sublabel: '[Externo]', borderColor: '#6E7681', labelColor: '#8B949E', dashed: true },
];

const homeConnections = [
  { x1: 118, y1: 45, x2: 128, y2: 85, color: '#30363D' },
  { x1: 70, y1: 118, x2: 130, y2: 128, color: '#30363D' },
  { x1: 215, y1: 118, x2: 190, y2: 128, color: '#30363D' },
  { x1: 130, y1: 190, x2: 130, y2: 214, color: '#30363D' },
];

function Home() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
      <div className="flex flex-col justify-center gap-4 px-8 py-16 md:px-16">
        <div className="mb-6 flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-text-primary">C4//diagrams</span>
        </div>

        <h1 className="max-w-md text-3xl font-medium leading-snug text-text-primary md:text-4xl">
          Documente a arquitetura do seu sistema do jeito que a banca (ou o time) espera ver
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
          Modelagem C4 guiada, com validação de hierarquia entre níveis e assistência de IA.
        </p>

        <nav className="mt-4 flex gap-4">
          <Link
            to="/cadastro"
            className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-fg"
          >
            Começar agora
          </Link>
          <Link
            to="/login"
            className="rounded-md px-6 py-3 text-sm font-medium text-text-secondary"
          >
            Entrar
          </Link>
        </nav>
      </div>

      <DiagramIllustration nodes={homeNodes} connections={homeConnections} />
    </div>
  );
}

export default Home;