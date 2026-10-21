import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Save, Trash2 } from 'lucide-react';
import Modal from '../Modal/Modal';
import FormInput from '../FormInput/FormInput';
import Button from '../Button/Button';
import ProjectPreview from '../ProjectPreview/ProjectPreview';
import { buttonClasses } from '../Button/buttonStyles';

const NAME_MAX_LENGTH = 255;
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

// Nota: aberto ao clicar no card do dashboard — prévia grande do Contexto (nível 1), edição do nome e da
// descrição (RF05) e os atalhos para abrir o editor ou excluir o projeto (RF06)
function ProjectDetailsModal({ project, onSave, onDelete, onClose }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const changed = name !== project.name || description !== (project.description ?? '');

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
          <ProjectPreview
            data={project.preview}
            showLabels
            className="h-64 overflow-hidden rounded-[var(--radius-control)] border border-line md:h-80"
          />
          <p className="text-xs text-text-muted">Prévia do diagrama de Contexto</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col">
          <FormInput
            id="project-details-name"
            label="Nome do projeto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            className="mb-4"
          />
          <FormInput
            id="project-details-description"
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
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
