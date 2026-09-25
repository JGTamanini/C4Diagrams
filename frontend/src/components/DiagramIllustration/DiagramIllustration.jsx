const NODE_WIDTH = 108;
const NODE_HEIGHT = 52;
const PADDING = 30;

function DiagramIllustration({ nodes, connections }) {
  const xs = nodes.flatMap((n) => [n.x, n.x + NODE_WIDTH]);
  const ys = nodes.flatMap((n) => [n.y, n.y + NODE_HEIGHT]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX + PADDING * 2;
  const height = Math.max(...ys) - minY + PADDING * 2;
  const offsetX = PADDING - minX;
  const offsetY = PADDING - minY;

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-canvas">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(var(--color-line) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%)',
        }}
      />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="relative w-full max-w-xl"
        style={{ transform: 'rotateX(55deg) rotateZ(-38deg)' }}
      >
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {connections.map((conn) => (
            <line
              key={`${conn.x1}-${conn.y1}-${conn.x2}-${conn.y2}`}
              x1={conn.x1}
              y1={conn.y1}
              x2={conn.x2}
              y2={conn.y2}
              stroke={conn.color || 'var(--color-line)'}
              strokeWidth="1.5"
            />
          ))}

          {nodes.map((node) => (
            <g key={node.label}>
              <rect
                x={node.x}
                y={node.y}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="6"
                fill="var(--color-surface)"
                stroke={node.borderColor}
                strokeDasharray={node.dashed ? '4 3' : undefined}
              />
              <text x={node.x + 10} y={node.y + 22} className="font-mono text-[11px]" fill={node.labelColor}>
                {node.label}
              </text>
              <text x={node.x + 10} y={node.y + 38} className="text-[10px]" fill="var(--color-text-muted)">
                {node.sublabel}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default DiagramIllustration;