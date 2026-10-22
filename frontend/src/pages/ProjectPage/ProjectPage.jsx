import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, Save } from 'lucide-react';
import AppHeader from '../../components/AppHeader/AppHeader';
import Brand from '../../components/Brand/Brand';
import Button from '../../components/Button/Button';
import { buttonClasses } from '../../components/Button/buttonStyles';
import DiagramCanvas from '../../components/DiagramCanvas/DiagramCanvas';
import ElementFormModal from '../../components/ElementFormModal/ElementFormModal';
import EditorToolbar from '../../components/EditorToolbar/EditorToolbar';
import { getProject, InvalidProjectIdError } from '../../services/projects';
import { useDiagramEditor } from '../../hooks/useDiagramEditor';
import { LEVELS } from '../../constants/c4Notation';

const SAVE_STATUS_TEXT = {
  saved: 'Todas as alterações salvas',
  pending: 'Alterações não salvas',
  saving: 'Salvando…',
  error: 'Falha ao salvar. Suas alterações continuam aqui — clique em Salvar para tentar de novo.',
};

function EditorBody({ editor, onEdit }) {
  if (editor.loadStatus === 'loading') {
    return <output className="block p-6 text-sm text-text-secondary">Carregando diagramas...</output>;
  }

  if (editor.loadStatus === 'error') {
    return (
      <p role="alert" className="p-6 text-center text-sm text-danger">
        Não foi possível carregar os diagramas deste projeto. Recarregue a página para tentar novamente.
      </p>
    );
  }

  return (
    <DiagramCanvas
      level={editor.activeLevel}
      nodes={editor.nodes}
      edges={editor.edges}
      onNodesChange={editor.onNodesChange}
      onEdgesChange={editor.onEdgesChange}
      onConnect={editor.connect}
      onAddNode={editor.addNode}
      onEditNode={(id) => onEdit({ kind: 'node', id })}
      onEditEdge={(id) => onEdit({ kind: 'edge', id })}
    />
  );
}

// Nota: o alvo do modal é procurado no nível ativo a cada render — se ele deixar de existir, o modal some
function findEditTarget(editor, editing) {
  if (!editing) return null;
  if (editing.kind === 'node') {
    const node = editor.nodes.find((candidate) => candidate.id === editing.id);
    return node && { kind: 'node', type: node.type, data: node.data };
  }
  const edge = editor.edges.find((candidate) => candidate.id === editing.id);
  return edge && { kind: 'edge', label: edge.label, data: edge.data };
}

function ElementEditor({ editor, editing, onClose }) {
  const target = findEditTarget(editor, editing);
  const isNode = editing?.kind === 'node';

  function handleSave(values) {
    if (isNode) editor.updateNode(editing.id, values);
    else editor.updateEdge(editing.id, values);
    onClose();
  }

  function handleDelete() {
    if (isNode) editor.removeNode(editing.id);
    else editor.removeEdge(editing.id);
    onClose();
  }

  // Nota: AnimatePresence mantém o modal na tela durante a animação de saída
  return (
    <AnimatePresence>
      {target && (
        <ElementFormModal
          key={`${editing.kind}-${editing.id}`}
          target={target}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

// Nota: editor de diagramas do projeto (wireframe 7) — níveis, paleta, conexões, modal de edição (RF22),
// legenda e salvamento automático
function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const editor = useDiagramEditor(id);
  const [editing, setEditing] = useState(null);
  const closeEditor = useCallback(() => setEditing(null), []);

  useEffect(() => {
    let active = true;

    getProject(id)
      .then((data) => active && setProject(data))
      .catch((err) => {
        if (!active) return;
        // Nota: id fora do formato é rejeitado antes da requisição e equivale a um 404 para o usuário
        const notFound = err instanceof InvalidProjectIdError || err.response?.status === 404;
        setErrorMessage(notFound ? 'Projeto não encontrado.' : 'Não foi possível carregar o projeto.');
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas font-sans">
        <AppHeader />
        <div className="p-6 text-center">
          <p role="alert" className="mb-4 text-text-secondary">
            {errorMessage}
          </p>
          <Link to="/projetos" className="text-link text-sm">
            Voltar para meus projetos
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas font-sans">
        <AppHeader />
        <output className="block p-6 text-sm text-text-secondary">Carregando projeto...</output>
      </div>
    );
  }

  const activeLevel = LEVELS.find((level) => level.id === editor.activeLevel);

  return (
    <div className="flex h-screen flex-col bg-canvas font-sans">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <div className="flex items-center gap-6">
          <Brand className="" />
          <Link to="/projetos" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Meus projetos
          </Link>
        </div>
      </header>

      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-2">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="truncate text-base font-semibold text-text-primary">
            {activeLevel.title} — {project.name}
          </h1>
          {editor.loadStatus === 'ready' && <EditorToolbar editor={editor} />}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <output
            data-testid="save-status"
            className={`text-xs ${editor.saveStatus === 'error' ? 'text-danger' : 'text-text-muted'}`}
          >
            {SAVE_STATUS_TEXT[editor.saveStatus]}
          </output>
          <Button size="sm" icon={Save} onClick={editor.save}>
            Salvar
          </Button>
        </div>
      </div>

      <main className="relative min-h-0 flex-1">
        <EditorBody editor={editor} onEdit={setEditing} />
      </main>

      <ElementEditor editor={editor} editing={editing} onClose={closeEditor} />

      <nav role="tablist" aria-label="Níveis do modelo C4" className="flex border-t border-line">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            role="tab"
            aria-selected={level.id === editor.activeLevel}
            onClick={() => editor.selectLevel(level.id)}
            className={`border-r border-line px-5 py-2.5 text-xs transition-colors duration-150 ${
              level.id === editor.activeLevel
                ? 'bg-surface-raised text-text-primary shadow-[inset_0_2px_0_0_var(--color-accent)]'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            {level.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default ProjectPage;
