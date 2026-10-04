import { NODE_TYPES } from '../../constants/diagramNodeTypes';

// Nota: placeholder da "Imagem Prévia" do wireframe 4 até existirem diagramas salvos (Fase 4)
const PREVIEW_NODES = [
  { x: 70, y: 12, ...NODE_TYPES.person },
  { x: 20, y: 62, ...NODE_TYPES.container },
  { x: 120, y: 62, ...NODE_TYPES.database },
];

function ProjectPreview() {
  return (
    <div aria-hidden="true" className="flex h-32 items-center justify-center bg-canvas-deep">
      <svg viewBox="0 0 200 110" className="h-full w-full max-w-[220px]">
        <line x1="100" y1="42" x2="50" y2="62" stroke="var(--color-line)" strokeWidth="1.5" />
        <line x1="100" y1="42" x2="150" y2="62" stroke="var(--color-line)" strokeWidth="1.5" />
        {PREVIEW_NODES.map((node) => (
          <rect
            key={`${node.x}-${node.y}`}
            x={node.x}
            y={node.y}
            width="60"
            height="30"
            rx="4"
            fill="var(--color-surface)"
            stroke={node.borderColor}
          />
        ))}
      </svg>
    </div>
  );
}

export default ProjectPreview;
