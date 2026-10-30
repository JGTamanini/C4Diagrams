import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { C4_ELEMENTS, RELATIONSHIP_COLOR } from '../../constants/c4Notation';

const ELEMENT_ORDER = Object.keys(C4_ELEMENTS);
const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Nota: a notação oficial pede que todo diagrama tenha legenda (c4model.com, "Notation") —
// explica as cores e formas dos tipos usados no diagrama e a leitura das conexões.
// Recolhível (aberta por padrão), para não cobrir elementos quando o diagrama ocupa o canto. Largura fixa e itens
// em uma linha só: aberta ou recolhida, ela ocupa sempre a mesma largura.
// rightInset: quanto o painel da direita (Assistente) cobre — a legenda fica ao lado dele, nunca embaixo
function DiagramLegend({ nodes, edges, rightInset = 0 }) {
  const [open, setOpen] = useState(true);

  if (nodes.length === 0) return null;

  const usedTypes = ELEMENT_ORDER.filter((type) => nodes.some((node) => node.type === type));

  return (
    <section
      aria-label="Legenda"
      style={{ right: rightInset + 16 }}
      className="absolute bottom-4 z-10 w-72 transition-[right] duration-200 overflow-hidden rounded-[var(--radius-control)] border border-line bg-surface/90 text-xs text-text-secondary shadow-[var(--shadow-card)] backdrop-blur-sm"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 font-semibold text-text-primary"
      >
        Legenda
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Abre e fecha deslizando a altura (AnimatePresence mantém o conteúdo durante a saída) */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="legend-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT_SOFT }}
          >
            <div className="px-4 pb-3">
              <ul className="flex flex-col gap-1.5">
                {usedTypes.map((type) => {
                  const element = C4_ELEMENTS[type];
                  return (
                    <li key={type} className="flex items-center gap-2 whitespace-nowrap">
                      <span
                        data-testid={`legend-swatch-${type}`}
                        aria-hidden="true"
                        className={`h-3 w-4 shrink-0 border ${element.shape === 'person' ? 'rounded-full' : 'rounded-sm'}`}
                        style={{ backgroundColor: element.background, borderColor: element.border }}
                      />
                      {element.name}
                    </li>
                  );
                })}
              </ul>

              {edges.length > 0 && (
                <p className="mt-2 flex items-center gap-2 whitespace-nowrap">
                  <span aria-hidden="true" style={{ color: RELATIONSHIP_COLOR }}>
                    - - →
                  </span>
                  <span>Relacionamento (rótulo [tecnologia])</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default DiagramLegend;
