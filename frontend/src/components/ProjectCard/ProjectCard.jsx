import { motion } from 'motion/react';
import ProjectPreview from '../ProjectPreview/ProjectPreview';

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

// Nota: o card inteiro abre o modal do projeto — o botão fica no título (nome acessível = nome do projeto) e se
// estende pelo card com ::after; hover levanta o card e destaca a borda
function ProjectCard({ project, onOpen }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-accent-text/50 hover:shadow-[var(--shadow-glow)] focus-within:border-accent-text/60"
    >
      <ProjectPreview data={project.preview} className="h-36 transition-opacity duration-200 group-hover:opacity-90" />

      <div className="border-t border-line p-4">
        <h3 className="truncate text-sm font-semibold text-text-primary">
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-[var(--radius-card)] focus-visible:after:outline-2 focus-visible:after:outline-accent-text"
          >
            {project.name}
          </button>
        </h3>
        <p className="mt-1 text-xs text-text-muted">Editado em {dateFormatter.format(new Date(project.updated_at))}</p>
      </div>
    </motion.article>
  );
}

export default ProjectCard;
