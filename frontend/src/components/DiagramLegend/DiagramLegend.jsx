import { ChevronDown } from 'lucide-react';
import { C4_ELEMENTS, RELATIONSHIP_COLOR } from '../../constants/c4Notation';

const ELEMENT_ORDER = Object.keys(C4_ELEMENTS);

// Nota: a notação oficial pede que todo diagrama tenha legenda (c4model.com, "Notation") —
// explica as cores e formas dos tipos usados no diagrama e a leitura das conexões
function DiagramLegend({ nodes, edges }) {
  if (nodes.length === 0) return null;

  const usedTypes = ELEMENT_ORDER.filter((type) => nodes.some((node) => node.type === type));

  return (
    <section
      aria-label="Legenda"
      className="absolute right-4 bottom-4 z-10 rounded-[var(--radius-control)] border border-line bg-surface/90 text-xs text-text-secondary shadow-[var(--shadow-card)] backdrop-blur-sm"
    >
      {/* Recolhível (aberta por padrão): não cobre elementos quando o diagrama ocupa o canto */}
      <details open className="group px-4 py-3">
        <summary className="flex list-none items-center justify-between gap-6 font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
          Legenda
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-text-muted transition-transform duration-150 group-open:rotate-180" />
        </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {usedTypes.map((type) => {
          const element = C4_ELEMENTS[type];
          return (
            <li key={type} className="flex items-center gap-2">
              <span
                data-testid={`legend-swatch-${type}`}
                aria-hidden="true"
                className={`h-3 w-4 border ${element.shape === 'person' ? 'rounded-full' : 'rounded-sm'}`}
                style={{ backgroundColor: element.background, borderColor: element.border }}
              />
              {element.name}
            </li>
          );
        })}
      </ul>
      {edges.length > 0 && (
        <p className="mt-2 flex items-center gap-2">
          <span aria-hidden="true" style={{ color: RELATIONSHIP_COLOR }}>- - →</span>
          <span>Relacionamento (rótulo [tecnologia])</span>
        </p>
      )}
      </details>
    </section>
  );
}

export default DiagramLegend;
