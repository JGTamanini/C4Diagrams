import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, PanelLeftClose } from 'lucide-react';
import { C4_ELEMENTS, LEVEL_ELEMENTS } from '../../constants/c4Notation';
import ElementGlyph from '../ElementGlyph/ElementGlyph';
import IconButton from '../Button/IconButton';

export const ELEMENT_DRAG_TYPE = 'application/x-c4-element';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Largura da paleta aberta (w-56) mais a margem dela sobre o canvas: o que ela cobre à esquerda
export const PALETTE_OFFSET = 236;

function handleDragStart(event, type) {
  event.dataTransfer.setData(ELEMENT_DRAG_TYPE, type);
  event.dataTransfer.effectAllowed = 'move';
}

// Nota: paleta do editor (wireframe 7) — só os elementos válidos no nível ativo (RN08), em grade com a miniatura
// do elemento e o nome curto embaixo (como em ferramentas de diagramação). Arrastar para o canvas é o caminho
// principal; o clique adiciona no centro e atende quem usa teclado. Flutua sobre o canvas e pode ser ocultada para o
// lado (onCollapse) ou recolhida na vertical, ficando só o título (collapsed + onToggleCollapsed).
function ElementPalette({ level, onAdd, onCollapse, collapsed = false, onToggleCollapsed }) {
  return (
    <aside
      aria-labelledby="element-palette-title"
      className="pointer-events-auto flex max-h-full w-56 flex-col gap-3 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface/95 p-4 shadow-[var(--shadow-raised)] backdrop-blur-sm"
    >
      {/* Título e botões numa linha; o subtítulo vem embaixo, na largura toda (não quebra por causa dos botões) */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 id="element-palette-title" className="text-sm font-semibold text-text-primary">
            Elementos
          </h2>
          <div className="-my-1.5 -mr-2 flex">
            {onToggleCollapsed && (
              <IconButton
                icon={ChevronDown}
                label={collapsed ? 'Expandir elementos' : 'Recolher elementos'}
                expanded={!collapsed}
                onClick={onToggleCollapsed}
                className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
              />
            )}
            {onCollapse && <IconButton icon={PanelLeftClose} label="Ocultar elementos" onClick={onCollapse} />}
          </div>
        </div>
        {!collapsed && <p className="mt-0.5 text-xs text-text-muted">Arraste para o canvas ou clique</p>}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
      <motion.ul
        key="palette-items"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT_SOFT }}
        className="grid shrink-0 grid-cols-2 gap-2 overflow-hidden"
      >
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
      </motion.ul>
        )}
      </AnimatePresence>
    </aside>
  );
}

export default ElementPalette;
