import { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import Button from '../Button/Button';
import { typeLabel, withTechnologyLabel } from '../../constants/c4Notation';

// "Banco: Grava [JDBC]": o outro elemento da relação e o rótulo com a tecnologia, como no diagrama
function relationText(edge, other) {
  const { label } = withTechnologyLabel(edge);
  return label ? `${other}: ${label}` : other;
}

function Relations({ title, items }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium text-text-muted">{title}</h3>
      <ul aria-label={title} className="flex flex-col gap-1 text-sm text-text-secondary">
        {items.map(({ id, text }) => (
          <li key={id} className="[overflow-wrap:anywhere]">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Nota: detalhes de um elemento na visualização do link (só leitura). No diagrama, a descrição aparece resumida no
// elemento e as relações ficam espalhadas; aqui vão a descrição completa, as relações de saída e de entrada, de quem o
// elemento faz parte e o nível que o detalha. Fica à esquerda, porque a legenda ocupa a direita.
function ElementDetails({ node, nodes, edges, partOf = null, detailedIn = null, onOpenLevel, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const nameOf = (id) => nodes.find((candidate) => candidate.id === id)?.data.label ?? '';
  const outgoing = edges
    .filter((edge) => edge.source === node.id)
    .map((edge) => ({ id: edge.id, text: relationText(edge, nameOf(edge.target)) }));
  const incoming = edges
    .filter((edge) => edge.target === node.id)
    .map((edge) => ({ id: edge.id, text: relationText(edge, nameOf(edge.source)) }));

  return (
    <aside
      aria-label="Detalhes do elemento"
      className="absolute top-16 left-3 z-20 flex max-h-[calc(100%-4.75rem)] w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/95 shadow-[var(--shadow-raised)] backdrop-blur-sm"
    >
      <div className="flex items-start gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text-primary [overflow-wrap:anywhere]">{node.data.label}</h2>
          <p className="text-xs text-text-muted">{typeLabel(node.type, node.data.technology)}</p>
        </div>
        <button
          type="button"
          aria-label="Fechar detalhes"
          title="Fechar (Esc)"
          onClick={onClose}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-canvas hover:text-text-primary"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
        <p className="text-sm leading-relaxed whitespace-pre-line text-text-secondary [overflow-wrap:anywhere]">
          {node.data.description || <span className="text-text-muted">Sem descrição.</span>}
        </p>

        {partOf && (
          <div>
            <h3 className="mb-1 text-xs font-medium text-text-muted">Parte de</h3>
            <p className="text-sm text-text-secondary [overflow-wrap:anywhere]">{partOf}</p>
          </div>
        )}

        {outgoing.length === 0 && incoming.length === 0 ? (
          <p className="text-sm text-text-muted">Sem relações.</p>
        ) : (
          <>
            <Relations title="Relações de saída" items={outgoing} />
            <Relations title="Relações de entrada" items={incoming} />
          </>
        )}

        {detailedIn && (
          <div className="border-t border-line pt-3">
            <p className="mb-2 text-xs text-text-muted">O que existe dentro deste elemento está no nível {detailedIn.label}.</p>
            <Button size="sm" variant="secondary" icon={ArrowRight} onClick={() => onOpenLevel(detailedIn.id)}>
              {`Ver o nível ${detailedIn.label}`}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default ElementDetails;
