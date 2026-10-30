import { PanelLeftClose } from 'lucide-react';
import { C4_ELEMENTS, LEVEL_ELEMENTS } from '../../constants/c4Notation';
import ElementGlyph from '../ElementGlyph/ElementGlyph';
import IconButton from '../Button/IconButton';

export const ELEMENT_DRAG_TYPE = 'application/x-c4-element';

// Largura da paleta aberta (w-56) mais a margem dela sobre o canvas: o que ela cobre à esquerda
export const PALETTE_OFFSET = 236;

function handleDragStart(event, type) {
  event.dataTransfer.setData(ELEMENT_DRAG_TYPE, type);
  event.dataTransfer.effectAllowed = 'move';
}

// Nota: paleta do editor (wireframe 7) — só os elementos válidos no nível ativo (RN08), em grade com a miniatura
// do elemento e o nome curto embaixo (como em ferramentas de diagramação). Arrastar para o canvas é o caminho
// principal; o clique adiciona no centro e atende quem usa teclado. Flutua sobre o canvas e pode ser ocultada.
function ElementPalette({ level, onAdd, onCollapse }) {
  return (
    <aside
      aria-labelledby="element-palette-title"
      className="pointer-events-auto flex max-h-full w-56 flex-col gap-3 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface/95 p-4 shadow-[var(--shadow-raised)] backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="element-palette-title" className="text-sm font-semibold text-text-primary">
            Elementos
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">Arraste para o canvas ou clique</p>
        </div>
        {onCollapse && <IconButton icon={PanelLeftClose} label="Ocultar elementos" onClick={onCollapse} className="-mt-1 -mr-2" />}
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
                className="flex h-[76px] w-full cursor-grab flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface-raised text-[11px] font-medium text-text-secondary transition-[border-color,background-color,color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent-text/50 hover:bg-[#1e2a42] hover:text-text-primary active:scale-95 active:cursor-grabbing"
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
