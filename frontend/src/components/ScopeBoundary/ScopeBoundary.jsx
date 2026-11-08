import { ViewportPortal, useNodes } from '@xyflow/react';

// Folga entre os elementos de dentro e a linha tracejada; embaixo, mais espaço para o nome do elemento detalhado
const PADDING = 40;
const LABEL_SPACE = 44;
// Tamanho usado enquanto o elemento ainda não foi medido na tela
const FALLBACK_SIZE = { width: 200, height: 120 };

// Nota: RF22 — fronteira tracejada (boundary) da notação C4: envolve os elementos que pertencem ao elemento detalhado
// pelo nível (os containers do sistema; os componentes do container), com o nome dele embaixo. É automática:
// acompanha os elementos de dentro quando eles se movem, fica atrás de tudo e não recebe cliques.
function ScopeBoundary({ boundary }) {
  const nodes = useNodes();
  if (!boundary) return null;

  const inner = nodes.filter((node) => boundary.innerTypes.includes(node.type));
  if (inner.length === 0) return null;

  const boxes = inner.map((node) => ({
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? FALLBACK_SIZE.width,
    height: node.measured?.height ?? FALLBACK_SIZE.height,
  }));
  const left = Math.min(...boxes.map((box) => box.x)) - PADDING;
  const top = Math.min(...boxes.map((box) => box.y)) - PADDING;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + PADDING;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + PADDING + LABEL_SPACE;

  return (
    <ViewportPortal>
      <div
        role="group"
        aria-label={`Fronteira: ${boundary.label} [${boundary.type}]`}
        className="c4-scope-boundary pointer-events-none absolute rounded-2xl border-2 border-dashed border-[#7d8aa3]"
        style={{ transform: `translate(${left}px, ${top}px)`, width: right - left, height: bottom - top, zIndex: -1 }}
      >
        <div className="absolute bottom-3 left-4 leading-tight">
          <p className="c4-scope-boundary-label text-sm font-semibold text-text-primary">{boundary.label}</p>
          <p className="c4-scope-boundary-type text-xs text-text-secondary">[{boundary.type}]</p>
        </div>
      </div>
    </ViewportPortal>
  );
}

export default ScopeBoundary;
