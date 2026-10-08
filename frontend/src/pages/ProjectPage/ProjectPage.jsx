import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppHeader from '../../components/AppHeader/AppHeader';
import Brand from '../../components/Brand/Brand';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
import DiagramCanvas from '../../components/DiagramCanvas/DiagramCanvas';
import { getProject, InvalidProjectIdError } from '../../services/projects';
import { useDiagramEditor } from '../../hooks/useDiagramEditor';
import { LEVELS } from '../../constants/c4Notation';

const SAVE_STATUS_TEXT = {
  saved: 'Todas as alterações salvas',
  pending: 'Alterações não salvas',
  saving: 'Salvando…',
  error: 'Falha ao salvar. Suas alterações continuam aqui — clique em Salvar para tentar de novo.',
};

function EditorBody({ editor }) {
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
      nodes={editor.nodes}
      edges={editor.edges}
      onNodesChange={editor.onNodesChange}
      onEdgesChange={editor.onEdgesChange}
    />
  );
}

// Nota: editor de diagramas do projeto (wireframe 7). Fase 4 — estrutura, níveis e salvamento;
// paleta, conexões, modal de elemento e legenda vêm no próximo incremento
function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const editor = useDiagramEditor(id);

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
          <Link to="/projetos" className="text-sm text-accent">
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
          <Link to="/projetos" className="text-sm text-text-secondary hover:text-text-primary">
            Meus projetos
          </Link>
        </div>
        <span data-testid="project-name" className="truncate text-sm font-medium text-text-primary">
          {project.name}
        </span>
      </header>

      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-2">
        <h1 className="truncate text-base font-medium text-text-primary">
          {activeLevel.title} — {project.name}
        </h1>
        <div className="flex shrink-0 items-center gap-4">
          <output
            data-testid="save-status"
            className={`text-xs ${editor.saveStatus === 'error' ? 'text-danger' : 'text-text-muted'}`}
          >
            {SAVE_STATUS_TEXT[editor.saveStatus]}
          </output>
          <PrimaryButton type="button" className="px-4 py-2" onClick={editor.save}>
            Salvar
          </PrimaryButton>
        </div>
      </div>

      <main className="relative min-h-0 flex-1">
        <EditorBody editor={editor} />
      </main>

      <nav role="tablist" aria-label="Níveis do modelo C4" className="flex border-t border-line">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            role="tab"
            aria-selected={level.id === editor.activeLevel}
            onClick={() => editor.setActiveLevel(level.id)}
            className={`border-r border-line px-5 py-2 text-xs ${
              level.id === editor.activeLevel ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'
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
