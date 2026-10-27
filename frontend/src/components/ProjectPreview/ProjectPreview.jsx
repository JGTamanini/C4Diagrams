import { Shapes } from 'lucide-react';
import { C4_ELEMENTS, RELATIONSHIP_COLOR } from '../../constants/c4Notation';

// Tamanho aproximado de um elemento no editor (C4Node): a prévia usa as mesmas posições salvas
const NODE_WIDTH = 200;
const NODE_HEIGHT = 96;
const PERSON_HEAD = 34;
const PADDING = 48;
// Cabe por linha no elemento da prévia (fonte de 20px em 200px de largura); no máximo duas linhas
const LABEL_LINE_CHARS = 16;
const LABEL_MAX_LINES = 2;

function truncate(text) {
  return text.length > LABEL_LINE_CHARS ? `${text.slice(0, LABEL_LINE_CHARS - 1).trimEnd()}…` : text;
}

// Quebra o nome por palavras; o que não couber nas duas linhas vira reticências
function wrapLabel(label) {
  const lines = [];
  let current = '';

  for (const word of label.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= LABEL_LINE_CHARS || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);

  if (lines.length <= LABEL_MAX_LINES) return lines.map(truncate);
  const rest = lines.slice(LABEL_MAX_LINES - 1).join(' ');
  return [...lines.slice(0, LABEL_MAX_LINES - 1).map(truncate), `${rest.slice(0, LABEL_LINE_CHARS - 1).trimEnd()}…`];
}

function viewBoxFor(nodes) {
  const xs = nodes.flatMap(({ position }) => [position.x, position.x + NODE_WIDTH]);
  const ys = nodes.flatMap(({ position }) => [position.y - PERSON_HEAD, position.y + NODE_HEIGHT]);
  const minX = Math.min(...xs) - PADDING;
  const minY = Math.min(...ys) - PADDING;
  return `${minX} ${minY} ${Math.max(...xs) - minX + PADDING} ${Math.max(...ys) - minY + PADDING}`;
}

function center({ position }) {
  return { x: position.x + NODE_WIDTH / 2, y: position.y + NODE_HEIGHT / 2 };
}

function PreviewNode({ node, showLabels }) {
  const element = C4_ELEMENTS[node.type];
  const { x, y } = node.position;
  const isPerson = element.shape === 'person';

  return (
    <g data-testid="preview-node" data-type={node.type}>
      {isPerson && (
        <circle cx={x + NODE_WIDTH / 2} cy={y - 4} r={PERSON_HEAD} fill={element.background} stroke={element.border} strokeWidth="3" />
      )}
      <rect
        x={x}
        y={y}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={isPerson ? 34 : 12}
        fill={element.background}
        stroke={element.border}
        strokeWidth="3"
      />
      {showLabels && (
        <text textAnchor="middle" fill={element.color} className="font-sans text-[20px] font-semibold">
          {wrapLabel(node.data.label).map((line, index, lines) => (
            <tspan key={`${index}-${line}`} x={x + NODE_WIDTH / 2} y={y + NODE_HEIGHT / 2 + 7 + (index - (lines.length - 1) / 2) * 24}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

// Nota: prévia leve do diagrama de Contexto (nível 1) para o dashboard — SVG a partir dos dados salvos, com as
// cores oficiais do C4; sem React Flow, que seria pesado para vários cards
function ProjectPreview({ data, showLabels = false, className = 'h-36' }) {
  const nodes = data?.nodes ?? [];

  if (nodes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-canvas-deep text-text-muted ${className}`}>
        <Shapes aria-hidden="true" className="h-5 w-5" />
        <span className="text-xs">Diagrama de Contexto vazio</span>
      </div>
    );
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = (data.edges ?? []).filter((edge) => byId.has(edge.source) && byId.has(edge.target));

  return (
    <div
      aria-hidden="true"
      className={`bg-canvas-deep bg-[radial-gradient(var(--color-line-subtle)_1px,transparent_1px)] bg-size-[16px_16px] ${className}`}
    >
      <svg viewBox={viewBoxFor(nodes)} preserveAspectRatio="xMidYMid meet" className="h-full w-full p-3">
        {edges.map((edge) => {
          const from = center(byId.get(edge.source));
          const to = center(byId.get(edge.target));
          return (
            <line
              key={edge.id}
              data-testid="preview-edge"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={RELATIONSHIP_COLOR}
              strokeOpacity="0.55"
              strokeWidth="3"
              strokeDasharray="10 8"
            />
          );
        })}
        {nodes.map((node) => (
          <PreviewNode key={node.id} node={node} showLabels={showLabels} />
        ))}
      </svg>
    </div>
  );
}

export default ProjectPreview;
