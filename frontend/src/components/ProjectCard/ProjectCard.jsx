import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import IconButton from '../Button/IconButton';
import ProjectPreview from '../ProjectPreview/ProjectPreview';

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

function ProjectCard({ project, onEdit, onDelete }) {
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-surface">
      <ProjectPreview />

      <div className="flex items-start justify-between gap-2 border-t border-line p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-text-primary">
            <Link to={`/projetos/${project.id}`} className="transition-colors duration-150 hover:text-accent-text">
              {project.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-text-muted">Editado em {dateFormatter.format(new Date(project.updated_at))}</p>
        </div>

        <div className="flex shrink-0 gap-1">
          <IconButton icon={Pencil} label={`Editar projeto ${project.name}`} onClick={() => onEdit(project)} />
          <IconButton
            icon={Trash2}
            label={`Excluir projeto ${project.name}`}
            onClick={() => onDelete(project)}
            tone="danger"
          />
        </div>
      </div>
    </article>
  );
}

export default ProjectCard;
