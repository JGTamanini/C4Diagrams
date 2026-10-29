import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Save, Trash2 } from 'lucide-react';
import Modal from '../Modal/Modal';
import FormInput from '../FormInput/FormInput';
import Button from '../Button/Button';
import ProjectPreview from '../ProjectPreview/ProjectPreview';
import { buttonClasses } from '../Button/buttonStyles';
import { listDiagrams } from '../../services/diagrams';
import { PROJECT_NAME_MAX_LENGTH, PROJECT_DESCRIPTION_MAX_LENGTH } from '../../constants/projectLimits';

const dateFormatter = new Intl.DateTimeFormat('pt-BR');
const PREVIEW_CLASSES = 'h-64 overflow-hidden rounded-[var(--radius-control)] border border-line md:h-80';

// Nota: a prévia é buscada só quando o modal abre (a listagem do dashboard não traz os diagramas)
function useContextPreview(projectId) {
  const [preview, setPreview] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let active = true;

    listDiagrams(projectId)
      .then((diagrams) => {
        if (!active) return;
        const context = diagrams.find((diagram) => diagram.level === 'context');
        setPreview({ status: 'ready', data: context?.data ?? null });
      })
      .catch(() => active && setPreview({ status: 'error', data: null }));

    return () => {
      active = false;
    };
  }, [projectId]);

  return preview;
}

function PreviewArea({ preview }) {
  if (preview.status === 'loading') {
    return (
      <div className={`animate-pulse bg-canvas-deep ${PREVIEW_CLASSES}`}>
        <output className="sr-only">Carregando prévia...</output>
      </div>
    );
  }

  if (preview.status === 'error') {
    return (
      <div className={`flex items-center justify-center bg-canvas-deep text-xs text-text-muted ${PREVIEW_CLASSES}`}>
        Não foi possível carregar a prévia.
      </div>
    );
  }

  return <ProjectPreview data={preview.data} showLabels className={PREVIEW_CLASSES} />;
}

// Nota: aberto ao clicar no card do dashboard — prévia grande do Contexto (nível 1), edição do nome e da
// descrição (RF05) e os atalhos para abrir o editor ou excluir o projeto (RF06)
function ProjectDetailsModal({ project, onSave, onDelete, onClose }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const changed = name !== project.name || description !== (project.description ?? '');
  const preview = useContextPreview(project.id);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('O nome do projeto é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ name, description });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Não foi possível salvar o projeto. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <Modal title={project.name} onClose={onClose} closable size="lg">
      <div className="grid gap-6 md:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-2">
          <PreviewArea preview={preview} />
          <p className="text-xs text-text-muted">Prévia do diagrama de Contexto</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col">
          <FormInput
            id="project-details-name"
            label="Nome do projeto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={PROJECT_NAME_MAX_LENGTH}
            className="mb-4"
          />
          <FormInput
            id="project-details-description"
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
            required={false}
            className="mb-3"
          />
          <p className="mb-4 text-xs text-text-muted">Editado em {dateFormatter.format(new Date(project.updated_at))}</p>

          {errorMessage && (
            <p role="alert" className="mb-3 text-sm text-danger">
              {errorMessage}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-3">
            <Link to={`/projetos/${project.id}`} className={buttonClasses({ className: 'w-full' })}>
              Abrir editor
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <div className="flex items-center justify-between gap-2">
              <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={() => onDelete(project)} className="-ml-3">
                Excluir projeto
              </Button>
              <Button type="submit" variant="secondary" size="sm" icon={Save} disabled={!changed} loading={saving}>
                Salvar alterações
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default ProjectDetailsModal;
