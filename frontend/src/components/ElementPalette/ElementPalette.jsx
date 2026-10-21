import { C4_ELEMENTS, LEVEL_ELEMENTS } from '../../constants/c4Notation';
import ElementGlyph from '../ElementGlyph/ElementGlyph';

export const ELEMENT_DRAG_TYPE = 'application/x-c4-element';

function handleDragStart(event, type) {
  event.dataTransfer.setData(ELEMENT_DRAG_TYPE, type);
  event.dataTransfer.effectAllowed = 'move';
}

// Nota: sidebar do editor (wireframe 7) — só os elementos válidos no nível ativo (RN08), em grade com a miniatura
// do elemento e o nome curto embaixo (como em ferramentas de diagramação). Arrastar para o canvas é o caminho
// principal; o clique adiciona no centro e atende quem usa teclado.
function ElementPalette({ level, onAdd }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r border-line bg-canvas p-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Elementos</h2>
        <p className="mt-0.5 text-xs text-text-muted">Arraste para o canvas ou clique</p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {LEVEL_ELEMENTS[level].map((type) => {
          const element = C4_ELEMENTS[type];
          return (
            <li key={type}>
              <button
                type="button"
                draggable
                aria-label={element.name}
                title={`${element.name} — arraste para o canvas ou clique para adicionar`}
                onDragStart={(event) => handleDragStart(event, type)}
                onClick={() => onAdd(type)}
                className="flex h-[76px] w-full cursor-grab flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface text-[11px] font-medium text-text-secondary transition-[border-color,background-color,color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent-text/50 hover:bg-surface-raised hover:text-text-primary active:scale-95 active:cursor-grabbing"
              >
                <ElementGlyph type={type} />
                <span className="truncate px-1">{element.shortName}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default ElementPalette;
