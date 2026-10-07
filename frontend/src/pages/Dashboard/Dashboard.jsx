import { useCallback, useEffect, useState } from 'react';
import AppHeader from '../../components/AppHeader/AppHeader';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
import ProjectCard from '../../components/ProjectCard/ProjectCard';
import ProjectFormModal from '../../components/ProjectFormModal/ProjectFormModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
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

// Nota: projeto criado/editado vai para o topo — mantém a ordem por updated_at DESC sem nova requisição
function moveToTop(projects, project) {
  return [project, ...projects.filter((p) => p.id !== project.id)];
}

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading');
  const [formModal, setFormModal] = useState(null);
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

  const openCreate = () => setFormModal({ mode: 'create' });
  const closeForm = useCallback(() => setFormModal(null), []);
  const cancelDelete = useCallback(() => setProjectToDelete(null), []);

  async function handleFormSubmit(values) {
    const saved =
      formModal.mode === 'edit' ? await updateProject(formModal.project.id, values) : await createProject(values);

    setProjects((current) => moveToTop(current, saved));
    setFormModal(null);
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

      <div className="h-40 border-b border-line">
        <DiagramIllustration nodes={bannerNodes} connections={bannerConnections} />
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-medium text-text-primary">Meus Projetos</h1>
          <PrimaryButton type="button" className="px-5" onClick={openCreate}>
            Novo Projeto
          </PrimaryButton>
        </div>

        {actionError && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {actionError}
          </p>
        )}

        {status === 'loading' && (
          <output className="block text-sm text-text-secondary">
            Carregando projetos...
          </output>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p role="alert" className="mb-4 text-sm text-danger">
              Não foi possível carregar seus projetos.
            </p>
            <button type="button" onClick={retryLoad} className="text-sm text-accent">
              Tentar novamente
            </button>
          </div>
        )}

        {status === 'ready' && projects.length === 0 && (
          <div className="py-20 text-center">
            <p className="mb-2 text-text-secondary">Você ainda não tem projetos criados.</p>
            <button type="button" onClick={openCreate} className="text-sm font-medium uppercase text-accent">
              Crie um agora
            </button>
          </div>
        )}

        {status === 'ready' && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setFormModal({ mode: 'edit', project: p })}
                onDelete={setProjectToDelete}
              />
            ))}
          </div>
        )}
      </main>

      {formModal && (
        <ProjectFormModal
          mode={formModal.mode}
          initialValues={formModal.project}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
        />
      )}

      {projectToDelete && (
        <ConfirmDialog
          title="Excluir projeto"
          message={`O projeto "${projectToDelete.name}" e todos os seus diagramas serão excluídos permanentemente. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={handleConfirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}

export default Dashboard;
