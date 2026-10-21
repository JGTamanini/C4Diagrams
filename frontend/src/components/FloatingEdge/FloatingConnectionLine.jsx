import { borderPointToward } from './edgeGeometry';

// Nota: pré-visualização ao conectar — sai da borda do elemento virada para o cursor, em linha reta e tracejada,
// do mesmo jeito que a conexão vai ficar (em vez da curva padrão do React Flow)
function FloatingConnectionLine({ fromNode, toX, toY }) {
  if (!fromNode) return null;

  const rect = {
    x: fromNode.internals.positionAbsolute.x,
    y: fromNode.internals.positionAbsolute.y,
    width: fromNode.measured.width,
    height: fromNode.measured.height,
  };
  const start = borderPointToward(rect, { x: toX, y: toY });

  return (
    <g>
      <path
        d={`M ${start.x} ${start.y} L ${toX} ${toY}`}
        fill="none"
        stroke="var(--color-accent-text)"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <circle cx={toX} cy={toY} r={4} fill="var(--color-accent-text)" />
    </g>
  );
}

export default FloatingConnectionLine;
