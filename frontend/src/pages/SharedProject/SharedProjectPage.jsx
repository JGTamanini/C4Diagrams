import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import Brand from '../../components/Brand/Brand';
import LevelTabs from '../../components/LevelTabs/LevelTabs';
import DiagramViewer from '../../components/DiagramViewer/DiagramViewer';
import ElementDetails from '../../components/ElementDetails/ElementDetails';
import { buttonClasses } from '../../components/Button/buttonStyles';
import { getSharedProject } from '../../services/share';
import { fromApi } from '../../services/diagramMapper';
import { LEVELS, LEVEL_IDS } from '../../constants/c4Notation';
import { INNER_TYPES, SCOPE_TYPE_LABEL, detailLevelOf, isInnerType, resolveScope } from '../../constants/levelScope';

const GENERIC_ERROR = 'Não foi possível abrir este link agora. Tente de novo em instantes.';

// "12/11/2026 às 10:05", no fuso de quem está vendo
function formatUpdatedAt(value) {
  const when = new Date(value);
  const date = when.toLocaleDateString('pt-BR');
  const time = when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

// Os três níveis no formato do editor, e o foco de cada um (para a fronteira tracejada, como no editor)
function levelsFrom(diagrams) {
  const byLevel = Object.fromEntries(LEVEL_IDS.map((level) => [level, { nodes: [], edges: [] }]));
  diagrams.forEach(({ level, data }) => {
    if (byLevel[level]) byLevel[level] = fromApi(data);
  });
  return {
    byLevel,
    nodesByLevel: Object.fromEntries(LEVEL_IDS.map((level) => [level, byLevel[level].nodes])),
    scopeByLevel: Object.fromEntries(LEVEL_IDS.map((level) => [level, byLevel[level].scope ?? null])),
  };
}

function boundaryOf(level, levels) {
  const focus = resolveScope(level, levels.nodesByLevel, levels.scopeByLevel)?.focus;
  return focus ? { label: focus.data.label, type: SCOPE_TYPE_LABEL[level], innerTypes: INNER_TYPES[level] } : null;
}

// O nível que detalha o elemento ("Ver o nível Container"), só quando ele é mesmo o foco daquele nível
function detailedInOf(level, node, levels) {
  const detailLevel = detailLevelOf(level, node.type);
  if (!detailLevel) return null;
  const focus = resolveScope(detailLevel, levels.nodesByLevel, levels.scopeByLevel)?.focus;
  if (focus?.id !== node.id) return null;
  return { id: detailLevel, label: LEVELS.find((candidate) => candidate.id === detailLevel).label };
}

// Nota: link de visualização — qualquer pessoa logada com o link vê o projeto, sem poder editar. Mostra sempre a versão
// salva mais recente, com quem compartilhou e a data da última alteração (o professor vê se o diagrama mudou depois da
// entrega). Só o que ajuda a ler: abas de nível, legenda, fronteira, zoom e os detalhes do elemento clicado.
function SharedProjectView({ token }) {
  const [shared, setShared] = useState(null);
  const [error, setError] = useState('');
  const [activeLevel, setActiveLevel] = useState('context');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    getSharedProject(token)
      .then((project) => active && setShared(project))
      .catch((err) => active && setError(err.response?.data?.message ?? GENERIC_ERROR));
    return () => {
      active = false;
    };
  }, [token]);

  const levels = useMemo(() => (shared ? levelsFrom(shared.diagrams) : null), [shared]);
  const closeDetails = useCallback(() => setSelectedId(null), []);

  // Trocar de nível fecha os detalhes: o elemento aberto pertence ao nível anterior
  function openLevel(level) {
    setActiveLevel(level);
    setSelectedId(null);
  }

  const boundary = levels ? boundaryOf(activeLevel, levels) : null;
  const selected = levels?.byLevel[activeLevel].nodes.find((node) => node.id === selectedId) ?? null;

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
        <Link to="/projetos" className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'justify-self-start' })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Meus projetos
        </Link>
        <div className="flex min-w-0 flex-col items-center text-center">
          {shared && (
            <>
              <h1 title={shared.name} className="max-w-[32rem] truncate text-base font-semibold text-text-primary">
                {shared.name}
              </h1>
              <p className="text-xs text-text-muted">
                Compartilhado por {shared.ownerName} · Última alteração: {formatUpdatedAt(shared.updatedAt)}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          {shared && (
            <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-text-secondary">
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
              Só visualização
            </span>
          )}
          <Brand className="ml-1" />
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        {!shared && !error && <p className="p-6 text-sm text-text-muted">Carregando…</p>}
        {error && (
          <p role="alert" className="mx-auto mt-16 max-w-md px-6 text-center text-sm text-text-secondary">
            {error}
          </p>
        )}
        {shared && (
          <>
            <LevelTabs activeLevel={activeLevel} onSelect={openLevel} />
            <DiagramViewer
              level={activeLevel}
              nodes={levels.byLevel[activeLevel].nodes}
              edges={levels.byLevel[activeLevel].edges}
              boundary={boundary}
              selectedId={selectedId}
              onSelectElement={setSelectedId}
            />
            {selected && (
              <ElementDetails
                key={selected.id}
                node={selected}
                nodes={levels.byLevel[activeLevel].nodes}
                edges={levels.byLevel[activeLevel].edges}
                partOf={boundary && isInnerType(activeLevel, selected.type) ? `${boundary.label} [${boundary.type}]` : null}
                detailedIn={detailedInOf(activeLevel, selected, levels)}
                onOpenLevel={openLevel}
                onClose={closeDetails}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Cada link tem a própria tela (key): ir de um link para outro sem recarregar não mostra o erro nem o projeto do
// anterior enquanto o novo carrega
function SharedProjectPage() {
  const { token } = useParams();
  return <SharedProjectView key={token} token={token} />;
}

export default SharedProjectPage;
