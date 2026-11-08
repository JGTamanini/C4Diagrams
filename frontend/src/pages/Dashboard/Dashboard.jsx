import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { BookOpen, FolderPlus, Plus, RotateCw, Upload } from 'lucide-react';
import AppHeader from '../../components/AppHeader/AppHeader';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
import ProjectCard from '../../components/ProjectCard/ProjectCard';
import ProjectFormModal from '../../components/ProjectFormModal/ProjectFormModal';
import ProjectDetailsModal from '../../components/ProjectDetailsModal/ProjectDetailsModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Button from '../../components/Button/Button';
import { buttonClasses } from '../../components/Button/buttonStyles';
import { NODE_TYPES } from '../../constants/diagramNodeTypes';
import { listProjects, createProject, updateProject, deleteProject, importProject } from '../../services/projects';
import { readProjectFile } from '../../services/projectFile';
import EXAMPLE_PROJECT from '../../constants/exampleProject.json';

const bannerNodes = [
  { x: 0, y: 40, label: 'Usuário', sublabel: '[Pessoa]', ...NODE_TYPES.person },
  { x: 150, y: 0, label: 'Web App', sublabel: '[Container]', ...NODE_TYPES.container },
  { x: 150, y: 80, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
];

const bannerConnections = [
  { x1: 108, y1: 66, x2: 150, y2: 26 },
  { x1: 108, y1: 66, x2: 150, y2: 106 },
];

const SKELETON_CARDS = 4;
const GRID = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

// Nota: projeto criado/editado vai para o topo — mantém a ordem por updated_at DESC sem nova requisição
function moveToTop(projects, project) {
  return [project, ...projects.filter((p) => p.id !== project.id)];
}

function LoadingCards() {
  return (
    <>
      <output className="sr-only">Carregando projetos...</output>
      <div aria-hidden="true" className={GRID}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-raised">
            <div className="h-32 animate-pulse bg-canvas-deep" />
            <div className="flex flex-col gap-2.5 p-4">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-line" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-line-subtle" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyState({ onCreate, onExample, busy }) {
  return (
    <div
      data-testid="empty-state"
      className="group flex w-full flex-1 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-canvas/40 px-8 py-10 text-center transition-[border-color,background-color] duration-300 hover:border-accent-text/40 hover:bg-surface-raised"
    >
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/12 text-accent-text transition-transform duration-300 group-hover:scale-105">
        <FolderPlus aria-hidden="true" className="h-6 w-6" />
      </span>
      <p className="mb-1 text-base font-medium text-text-primary">Você ainda não tem projetos criados.</p>
      <p className="mb-6 max-w-sm text-sm text-text-secondary">
        Crie um projeto para começar pelo diagrama de Contexto e detalhar o sistema nível a nível.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button icon={Plus} onClick={onCreate}>
          Criar meu primeiro projeto
        </Button>
        {/* RF15: um projeto completo (três níveis) para ver como um diagrama C4 fica pronto */}
        <Button variant="secondary" icon={BookOpen} onClick={onExample} disabled={busy}>
          Ver um projeto de exemplo
        </Button>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading');
  const [creating, setCreating] = useState(false);
  const [openProject, setOpenProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [actionError, setActionError] = useState('');
  const [importing, setImporting] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    listProjects()
      .then((data) => {
        if (!active) return;
        setProjects(data);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));

    return () => {
      active = false;
    };
  }, [reloadKey]);

  function retryLoad() {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  }

  const openCreate = () => setCreating(true);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeDetails = useCallback(() => setOpenProject(null), []);
  const cancelDelete = useCallback(() => setProjectToDelete(null), []);

  // Nota: RFC 3.1.2 — projeto criado leva o usuário direto ao editor (página do projeto)
  async function handleCreate(values) {
    const created = await createProject(values);
    setCreating(false);
    void navigate(`/projetos/${created.id}`);
  }

  // Nota: RF21/RF15 — importar sempre cria um projeto novo e leva ao editor dele; o motivo da recusa (formato, nível
  // com problema) vem do servidor
  async function importAndOpen(content, fallbackMessage) {
    setActionError('');
    setImporting(true);
    try {
      const created = await importProject(content);
      void navigate(`/projetos/${created.id}`);
    } catch (err) {
      setActionError(err.response?.data?.message ?? fallbackMessage);
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFile(event) {
    const [file] = event.target.files;
    // Limpa a escolha: o mesmo arquivo pode ser escolhido de novo depois de corrigido
    event.target.value = '';
    if (!file) return;

    let content;
    try {
      content = await readProjectFile(file);
    } catch (err) {
      setActionError(err.message);
      return;
    }
    await importAndOpen(content, 'Não foi possível importar o projeto. Tente novamente.');
  }

  function createExample() {
    void importAndOpen(EXAMPLE_PROJECT, 'Não foi possível criar o projeto de exemplo. Tente novamente.');
  }

  async function handleSaveDetails(values) {
    const updated = await updateProject(openProject.id, values);
    setProjects((current) => moveToTop(current, updated));
    setOpenProject(null);
  }

  function requestDelete(project) {
    setOpenProject(null);
    setProjectToDelete(project);
  }

  async function handleConfirmDelete() {
    const project = projectToDelete;
    setActionError('');
    try {
      await deleteProject(project.id);
      setProjects((current) => current.filter((p) => p.id !== project.id));
    } catch {
      setActionError('Não foi possível excluir o projeto. Tente novamente.');
    }
    setProjectToDelete(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans">
      <AppHeader />

      {/* Faixa ilustrada que se dissolve no fundo (sem borda) */}
      <div className="h-48 shrink-0 [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
        <DiagramIllustration nodes={bannerNodes} connections={bannerConnections} />
      </div>

      {/* Painel de conteúdo em faixa própria: toda a largura e o resto da altura da página */}
      {/* flex: o estado vazio preenche a altura que sobra, em vez de empurrar a página para baixo */}
      <main className="flex flex-1 flex-col border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pt-8 pb-10">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-text-primary">Meus projetos</h1>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" icon={BookOpen} onClick={createExample} disabled={importing}>
                Criar projeto de exemplo
              </Button>
              {/* RF21: o rótulo funciona como botão e abre a escolha do arquivo exportado */}
              <label htmlFor="import-project-file" className={buttonClasses({ variant: 'secondary', className: 'cursor-pointer' })}>
                <Upload aria-hidden="true" className="h-4 w-4" />
                Importar projeto
              </label>
              <input
                id="import-project-file"
                type="file"
                accept=".json,application/json"
                disabled={importing}
                onChange={handleImportFile}
                className="sr-only"
              />
              <Button icon={Plus} onClick={openCreate}>
                Novo projeto
              </Button>
            </div>
          </div>

          {actionError && (
            <p role="alert" className="mb-4 text-sm text-danger">
              {actionError}
            </p>
          )}

          {status === 'loading' && <LoadingCards />}

          {status === 'error' && (
            <div className="text-center">
              <p role="alert" className="mb-4 text-sm text-danger">
                Não foi possível carregar seus projetos.
              </p>
              <Button variant="secondary" size="sm" icon={RotateCw} onClick={retryLoad}>
                Tentar novamente
              </Button>
            </div>
          )}

          {status === 'ready' && projects.length === 0 && <EmptyState onCreate={openCreate} onExample={createExample} busy={importing} />}

          {status === 'ready' && projects.length > 0 && (
            <ul aria-label="Meus projetos" className={GRID}>
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard project={project} onEdit={setOpenProject} onDelete={setProjectToDelete} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* AnimatePresence: mantém cada modal na tela durante a animação de saída */}
      <AnimatePresence>
        {creating && <ProjectFormModal key="project-form" onSubmit={handleCreate} onClose={closeCreate} />}
      </AnimatePresence>

      <AnimatePresence>
        {openProject && (
          <ProjectDetailsModal
            key={`project-details-${openProject.id}`}
            project={openProject}
            onSave={handleSaveDetails}
            onDelete={requestDelete}
            onClose={closeDetails}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {projectToDelete && (
          <ConfirmDialog
            key="confirm-delete"
            title="Excluir projeto"
            message={`O projeto "${projectToDelete.name}" e todos os seus diagramas serão excluídos permanentemente. Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir"
            onConfirm={handleConfirmDelete}
            onCancel={cancelDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;
