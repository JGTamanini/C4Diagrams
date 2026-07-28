import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Nós de exemplo representando elementos C4 (Nível: Context)
// Isso é apenas uma prova de conceito para validar o React Flow como
// engine de canvas antes de implementar os elementos C4 reais (RF08-RF11).
const initialNodes = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: '[Person]\nUsuário' },
    style: { background: '#08427b', color: '#fff', borderRadius: 8, padding: 10 },
  },
  {
    id: '2',
    position: { x: 250, y: 150 },
    data: { label: '[Software System]\nC4Diagrams' },
    style: { background: '#1168bd', color: '#fff', borderRadius: 8, padding: 10 },
  },
  {
    id: '3',
    position: { x: 500, y: 0 },
    data: { label: '[Software System]\nGoogle Gemini API' },
    style: { background: '#999999', color: '#fff', borderRadius: 8, padding: 10 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'Cria diagramas usando', animated: true },
  { id: 'e2-3', source: '2', target: '3', label: 'Solicita sugestões via', animated: true },
];

export default function Canvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
