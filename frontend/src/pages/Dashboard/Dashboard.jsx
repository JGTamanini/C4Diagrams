import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { FolderPlus, Plus, RotateCw } from 'lucide-react';
import AppHeader from '../../components/AppHeader/AppHeader';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
import ProjectCard from '../../components/ProjectCard/ProjectCard';
import ProjectFormModal from '../../components/ProjectFormModal/ProjectFormModal';
import ProjectDetailsModal from '../../components/ProjectDetailsModal/ProjectDetailsModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import Button from '../../components/Button/Button';
import { NODE_TYPES } from '../../constants/diagramNodeTypes';
import { listProjects, createProject, updateProject, deleteProject } from '../../services/projects';

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

// Nota: projeto criado/editado vai para o topo — mantém a ordem por updated_at DESC sem nova requisição.
// A resposta do PATCH não traz a prévia, então a que já estava na tela é preservada.
function moveToTop(projects, project) {
  const previous = projects.find((p) => p.id === project.id);
  return [{ preview: previous?.preview ?? null, ...project }, ...projects.filter((p) => p.id !== project.id)];
}

function LoadingCards() {
  return (
    <>
      <output className="sr-only">Carregando projetos...</output>
      <div aria-hidden="true" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface">
            <div className="h-36 animate-pulse bg-surface-raised" />
            <div className="space-y-2 p-4">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-raised" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-raised" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="group mx-auto mt-4 flex max-w-xl flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60 px-8 py-14 text-center transition-[border-color,background-color] duration-300 hover:border-accent-text/40 hover:bg-surface">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/12 text-accent-text transition-transform duration-300 group-hover:scale-105">
        <FolderPlus aria-hidden="true" className="h-6 w-6" />
      </span>
      <p className="mb-1 text-base font-medium text-text-primary">Você ainda não tem projetos criados.</p>
      <p className="mb-6 max-w-sm text-sm text-text-secondary">
        Crie um projeto para começar pelo diagrama de Contexto e detalhar o sistema nível a nível.
      </p>
      <Button icon={Plus} onClick={onCreate}>
        Criar meu primeiro projeto
      </Button>
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
    <div className="min-h-screen bg-canvas font-sans">
      <AppHeader />

      {/* Faixa ilustrada que se dissolve no fundo (sem borda) */}
      <div className="h-40 [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
        <DiagramIllustration nodes={bannerNodes} connections={bannerConnections} />
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-primary">Meus projetos</h1>
          <Button icon={Plus} onClick={openCreate}>
            Novo projeto
          </Button>
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

        {status === 'ready' && projects.length === 0 && <EmptyState onCreate={openCreate} />}

        {status === 'ready' && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={setOpenProject} />
            ))}
          </div>
        )}
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
