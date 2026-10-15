import { C4_ELEMENTS, LEVEL_ELEMENTS } from '../../constants/c4Notation';

export const ELEMENT_DRAG_TYPE = 'application/x-c4-element';

// Nota: sidebar do editor (wireframe 7) — só os elementos válidos no nível ativo (RN08).
// Arrastar para o canvas é o caminho principal; o clique adiciona no centro e atende quem usa teclado.
function ElementPalette({ level, onAdd }) {
  function handleDragStart(event, type) {
    event.dataTransfer.setData(ELEMENT_DRAG_TYPE, type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="flex w-48 shrink-0 flex-col gap-3 overflow-y-auto border-r border-line p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-text-secondary">Elementos</h2>
      <ul className="flex flex-col gap-2">
        {LEVEL_ELEMENTS[level].map((type) => {
          const element = C4_ELEMENTS[type];
          return (
            <li key={type}>
              <button
                type="button"
                draggable
                onDragStart={(event) => handleDragStart(event, type)}
                onClick={() => onAdd(type)}
                className="flex w-full cursor-grab items-center gap-2 rounded-md border border-line px-3 py-2 text-left text-sm text-text-primary hover:bg-surface active:cursor-grabbing"
              >
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 border ${element.shape === 'person' ? 'rounded-full' : 'rounded-sm'}`}
                  style={{ backgroundColor: element.background, borderColor: element.border }}
                />
                {element.name}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default ElementPalette;
