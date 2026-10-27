import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Pencil, Trash2 } from 'lucide-react';
import IconButton from '../Button/IconButton';
import ProjectCover from '../ProjectCover/ProjectCover';

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

// Nota: o nome é o link para o editor e se estende pelo card com ::after (o card inteiro abre o editor);
// "Editar" (modal com a prévia, o nome e a descrição) e "Excluir" (confirmação) ficam acima dessa camada
function ProjectCard({ project, onEdit, onDelete }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-raised shadow-[var(--shadow-card)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-accent-text/50 hover:shadow-[var(--shadow-glow)] focus-within:border-accent-text/60"
    >
      <ProjectCover seed={project.id} className="h-32 border-b border-line transition-opacity duration-200 group-hover:opacity-90" />

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-sm font-semibold text-text-primary">
          <Link
            to={`/projetos/${project.id}`}
            className="outline-none transition-colors duration-150 group-hover:text-accent-text after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-[var(--radius-card)] focus-visible:after:outline-2 focus-visible:after:outline-accent-text"
          >
            {project.name}
          </Link>
        </h3>
        {project.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{project.description}</p>}

        <div className="mt-auto flex items-center justify-between pt-3">
          <p className="text-xs text-text-muted">Editado em {dateFormatter.format(new Date(project.updated_at))}</p>
          <div className="relative z-10 -mr-1.5 flex items-center gap-0.5">
            <IconButton icon={Pencil} label={`Editar projeto ${project.name}`} onClick={() => onEdit(project)} />
            <IconButton icon={Trash2} label={`Excluir projeto ${project.name}`} tone="danger" onClick={() => onDelete(project)} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default ProjectCard;
