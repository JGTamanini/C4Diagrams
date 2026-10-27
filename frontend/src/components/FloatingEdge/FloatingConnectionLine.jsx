import { borderPointToward } from './edgeGeometry';

function toRect(node) {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: node.measured.width,
    height: node.measured.height,
  };
}

function centerOf(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function isSameNode(a, b) {
  return a === b || (a.id !== undefined && a.id === b.id);
}

// Nota: pré-visualização ao conectar, em linha reta e tracejada como a conexão final. Solta, sai da borda do
// elemento virada para o cursor; sobre um elemento alvo, "gruda" ligando as bordas que se encaram — exatamente
// onde a conexão vai ficar, sem pular para um ponto fixo do elemento.
function FloatingConnectionLine({ fromNode, toNode, toX, toY }) {
  if (!fromNode) return null;

  const fromRect = toRect(fromNode);
  let start;
  let end;

  if (toNode && !isSameNode(toNode, fromNode)) {
    const targetRect = toRect(toNode);
    start = borderPointToward(fromRect, centerOf(targetRect));
    end = borderPointToward(targetRect, centerOf(fromRect));
  } else {
    start = borderPointToward(fromRect, { x: toX, y: toY });
    end = { x: toX, y: toY };
  }

  return (
    <g>
      <path
        d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
        fill="none"
        stroke="var(--color-accent-text)"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <circle cx={end.x} cy={end.y} r={4} fill="var(--color-accent-text)" />
    </g>
  );
}

export default FloatingConnectionLine;
