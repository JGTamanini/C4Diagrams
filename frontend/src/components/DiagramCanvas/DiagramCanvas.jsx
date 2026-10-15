import { useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import C4Node from '../C4Node/C4Node';
import { C4_ELEMENTS, withTechnologyLabel } from '../../constants/c4Notation';

// Fora do componente: o React Flow recria tudo se o objeto de tipos mudar a cada render
const NODE_TYPES = Object.fromEntries(Object.keys(C4_ELEMENTS).map((type) => [type, C4Node]));

function DiagramCanvas({ nodes, edges, onNodesChange, onEdgesChange }) {
  const displayedEdges = useMemo(() => edges.map(withTechnologyLabel), [edges]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={displayedEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode="dark"
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {nodes.length === 0 && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-muted">
          Este nível ainda não tem elementos.
        </p>
      )}
    </div>
  );
}

export default DiagramCanvas;
