import { useId } from 'react';
import { C4_ELEMENTS, RELATIONSHIP_COLOR } from '../../constants/c4Notation';
import { COVERS, coverVariant } from './projectCovers';

// Linhas claras dentro do elemento, só sugerindo o rótulo
function LabelLines({ x, y, w, h, color }) {
  const middle = y + h / 2;
  return (
    <g fill={color}>
      <rect x={x + 10} y={middle - 6} width={w * 0.55} height={4} rx={2} opacity={0.85} />
      <rect x={x + 10} y={middle + 3} width={w * 0.35} height={3} rx={1.5} opacity={0.5} />
    </g>
  );
}

function CoverShape({ shape }) {
  const { type, kind, x, y, w, h } = shape;
  const { background, border, color } = C4_ELEMENTS[type];

  if (kind === 'person') {
    const head = 11;
    return (
      <g>
        <circle data-c4-type={type} cx={x + w / 2} cy={y + head} r={head} fill={background} stroke={border} />
        <rect data-c4-type={type} x={x} y={y + head * 2 - 2} width={w} height={h - head * 2 + 2} rx={12} fill={background} stroke={border} />
      </g>
    );
  }

  if (kind === 'database') {
    const ry = 6;
    const body = `M${x} ${y + ry} v${h - ry * 2} a${w / 2} ${ry} 0 0 0 ${w} 0 v${-(h - ry * 2)}`;
    return (
      <g>
        <path data-c4-type={type} d={body} fill={background} stroke={border} />
        <ellipse data-c4-type={type} cx={x + w / 2} cy={y + ry} rx={w / 2} ry={ry} fill={background} stroke={border} />
        <LabelLines x={x} y={y + ry} w={w} h={h - ry} color={color} />
      </g>
    );
  }

  return (
    <g>
      <rect data-c4-type={type} x={x} y={y} width={w} height={h} rx={5} fill={background} stroke={border} />
      <LabelLines x={x} y={y} w={w} h={h} color={color} />
    </g>
  );
}

// Nota: capa padrão do card — ilustração decorativa com a notação oficial, variando por projeto
// (a prévia real do diagrama fica no modal do projeto)
function ProjectCover({ seed, className = '' }) {
  const markerId = `seta-${useId().replace(/[^\w-]/g, '')}`;
  const { shapes, links } = COVERS[coverVariant(seed)];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none bg-canvas-deep bg-[radial-gradient(var(--color-line-subtle)_1px,transparent_1px)] bg-size-[16px_16px] ${className}`}
    >
      <svg viewBox="0 0 320 140" className="h-full w-full">
        <defs>
          <marker id={markerId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L8 4 L0 8 z" fill={RELATIONSHIP_COLOR} opacity="0.6" />
          </marker>
        </defs>
        {links.map(([x1, y1, x2, y2]) => (
          <line
            key={`${x1}-${y1}-${x2}-${y2}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={RELATIONSHIP_COLOR}
            strokeOpacity="0.45"
            strokeDasharray="4 3"
            markerEnd={`url(#${markerId})`}
          />
        ))}
        {shapes.map((shape) => (
          <CoverShape key={`${shape.type}-${shape.x}-${shape.y}`} shape={shape} />
        ))}
      </svg>
    </div>
  );
}

export default ProjectCover;
