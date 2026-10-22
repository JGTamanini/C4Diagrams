import { useMemo, useRef } from 'react';
import { MousePointerClick } from 'lucide-react';
import { ReactFlow, ReactFlowProvider, Background, Controls, ConnectionMode, MarkerType, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import C4Node from '../C4Node/C4Node';
import ElementPalette, { ELEMENT_DRAG_TYPE } from '../ElementPalette/ElementPalette';
import DiagramLegend from '../DiagramLegend/DiagramLegend';
import FloatingEdge from '../FloatingEdge/FloatingEdge';
import FloatingConnectionLine from '../FloatingEdge/FloatingConnectionLine';
import { parallelOffsets } from '../FloatingEdge/edgeGeometry';
import {
  C4_ELEMENTS,
  RELATIONSHIP_COLOR,
  isAllowedInLevel,
  isValidRelationship,
  withTechnologyLabel,
} from '../../constants/c4Notation';

// Fora do componente: o React Flow recria tudo se o objeto de tipos mudar a cada render
const NODE_TYPES = Object.fromEntries(Object.keys(C4_ELEMENTS).map((type) => [type, C4Node]));
const EDGE_TYPES = { floating: FloatingEdge };

// Notação oficial: relacionamento unidirecional, linha tracejada com seta no destino
const RELATIONSHIP_STYLE = {
  markerEnd: { type: MarkerType.ArrowClosed, color: RELATIONSHIP_COLOR },
  style: { stroke: RELATIONSHIP_COLOR, strokeDasharray: '6 4' },
};

// Metade do tamanho aproximado do elemento: ao soltar, o cursor fica no centro dele, não no canto
const NODE_CENTER_OFFSET = { x: 100, y: 50 };

const DELETE_KEYS = ['Backspace', 'Delete'];

// Enquadramento inicial: mostra o diagrama inteiro, mas sem aproximar além do tamanho real quando há poucos elementos
const FIT_VIEW_OPTIONS = { maxZoom: 1, padding: 0.25 };

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function DiagramWorkspace({ level, nodes, edges, onNodesChange, onEdgesChange, onConnect, onAddNode, onEditNode, onEditEdge }) {
  const { screenToFlowPosition } = useReactFlow();
  const dropAreaRef = useRef(null);
  // Nota: só para exibição — tipo flutuante e deslocamento das relações paralelas não vão para a API
  const displayedEdges = useMemo(() => {
    const offsets = parallelOffsets(edges);
    return edges.map((edge) => ({
      ...withTechnologyLabel(edge),
      ...RELATIONSHIP_STYLE,
      type: 'floating',
      data: { ...edge.data, offset: offsets.get(edge.id) },
    }));
  }, [edges]);

  function addAt(type, screenPoint) {
    const position = screenToFlowPosition(screenPoint);
    onAddNode(type, { x: position.x - NODE_CENTER_OFFSET.x, y: position.y - NODE_CENTER_OFFSET.y });
  }

  function handleDrop(event) {
    event.preventDefault();
    const type = event.dataTransfer.getData(ELEMENT_DRAG_TYPE);
    if (!isAllowedInLevel(level, type)) return;
    addAt(type, { x: event.clientX, y: event.clientY });
  }

  function handlePaletteAdd(type) {
    const area = dropAreaRef.current.getBoundingClientRect();
    addAt(type, { x: area.left + area.width / 2, y: area.top + area.height / 2 });
  }

  return (
    <div className="flex h-full w-full">
      <ElementPalette level={level} onAdd={handlePaletteAdd} />

      <div
        ref={dropAreaRef}
        data-testid="diagram-drop-area"
        className="relative h-full min-w-0 flex-1"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          key={level}
          nodes={nodes}
          edges={displayedEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={(connection) => isValidRelationship(connection, edges)}
          onNodeDoubleClick={(_, node) => onEditNode(node.id)}
          onEdgeDoubleClick={(_, edge) => onEditEdge(edge.id)}
          deleteKeyCode={DELETE_KEYS}
          connectionLineComponent={FloatingConnectionLine}
          connectionRadius={36}
          zoomOnDoubleClick={false}
          colorMode="dark"
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
        >
          <Background gap={22} size={1.4} />
          <Controls showInteractive={false} />
        </ReactFlow>

        {nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <div className="flex max-w-sm flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/70 px-8 py-10 text-center backdrop-blur-sm">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/12 text-accent-text">
                <MousePointerClick aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-text-primary">Este nível ainda não tem elementos</p>
              <p className="mt-1 text-sm text-text-secondary">Arraste um elemento da paleta (ou clique nele) para começar.</p>
            </div>
          </div>
        ) : (
          <p
            data-testid="canvas-hints"
            className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-line-subtle bg-surface/85 px-4 py-1.5 text-[11px] text-text-muted backdrop-blur-sm"
          >
            Duplo clique para editar · Arraste de um ponto de conexão até outro elemento · Delete exclui
          </p>
        )}

        <DiagramLegend nodes={nodes} edges={edges} />
      </div>
    </div>
  );
}

// Nota: área de trabalho do editor — paleta do nível, canvas e legenda. O provider dá acesso à
// conversão de coordenadas da tela para o diagrama, usada ao soltar ou adicionar elementos.
function DiagramCanvas(props) {
  return (
    <ReactFlowProvider>
      <DiagramWorkspace {...props} />
    </ReactFlowProvider>
  );
}

export default DiagramCanvas;
