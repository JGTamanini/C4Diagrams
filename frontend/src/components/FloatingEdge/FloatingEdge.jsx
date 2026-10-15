import { BaseEdge, useInternalNode } from '@xyflow/react';
import { floatingEdgePath } from './edgeGeometry';

function toRect(node) {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: node.measured.width,
    height: node.measured.height,
  };
}

// Nota: relação C4 desenhada entre as bordas que se encaram — acompanha os elementos quando eles se movem,
// sem pontos de conexão fixos (o modelo C4 não tem "lado" de conexão)
function FloatingEdge({ id, source, target, label, markerEnd, style, data }) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const { path, labelX, labelY } = floatingEdgePath(toRect(sourceNode), toRect(targetNode), data.offset);

  return <BaseEdge id={id} path={path} label={label} labelX={labelX} labelY={labelY} markerEnd={markerEnd} style={style} />;
}

export default FloatingEdge;
