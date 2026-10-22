import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Pencil, Trash2 } from 'lucide-react';
import IconButton from '../Button/IconButton';

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

const HEADER_CELL = 'px-4 py-3 text-left text-xs font-medium text-text-muted';
const ACTION_HEADER_CELL = 'w-20 px-2 py-3 text-center text-xs font-medium text-text-muted';

// Nota: lista de projetos (sem prévia — ela fica no modal do projeto). O nome leva direto ao editor; "Editar" abre
// o modal com a prévia, o nome e a descrição; "Excluir" pede confirmação.
function ProjectList({ projects, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full border-collapse">
        <caption className="sr-only">Meus projetos</caption>
        <thead className="border-b border-line bg-canvas/40">
          <tr>
            <th scope="col" className={HEADER_CELL}>
              Nome
            </th>
            <th scope="col" className={`${HEADER_CELL} w-40`}>
              Editado em
            </th>
            <th scope="col" className={ACTION_HEADER_CELL}>
              Editar
            </th>
            <th scope="col" className={ACTION_HEADER_CELL}>
              Excluir
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <motion.tr
              key={project.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
              className="group border-b border-line-subtle transition-colors duration-150 last:border-b-0 hover:bg-surface-raised"
            >
              <td className="max-w-0 px-4 py-3.5">
                <Link
                  to={`/projetos/${project.id}`}
                  className="block truncate text-sm font-medium text-text-primary transition-colors duration-150 hover:text-accent-text group-hover:text-accent-text"
                >
                  {project.name}
                </Link>
                {project.description && <p className="mt-0.5 truncate text-xs text-text-muted">{project.description}</p>}
              </td>
              <td className="px-4 py-3.5 text-sm text-text-secondary">{dateFormatter.format(new Date(project.updated_at))}</td>
              <td className="px-2 py-3.5 text-center">
                <IconButton icon={Pencil} label={`Editar projeto ${project.name}`} onClick={() => onEdit(project)} />
              </td>
              <td className="px-2 py-3.5 text-center">
                <IconButton icon={Trash2} label={`Excluir projeto ${project.name}`} tone="danger" onClick={() => onDelete(project)} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProjectList;
