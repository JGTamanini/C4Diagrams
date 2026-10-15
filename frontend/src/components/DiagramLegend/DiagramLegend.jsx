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
      className="absolute right-4 bottom-4 z-10 rounded-md border border-line bg-surface/90 px-4 py-3 text-xs text-text-secondary"
    >
      <h2 className="mb-2 font-medium text-text-primary">Legenda</h2>
      <ul className="flex flex-col gap-1.5">
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
    </section>
  );
}

export default DiagramLegend;
