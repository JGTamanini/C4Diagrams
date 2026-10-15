import { useMemo, useRef } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MarkerType, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import C4Node from '../C4Node/C4Node';
import ElementPalette, { ELEMENT_DRAG_TYPE } from '../ElementPalette/ElementPalette';
import DiagramLegend from '../DiagramLegend/DiagramLegend';
import { C4_ELEMENTS, isAllowedInLevel, isValidRelationship, withTechnologyLabel } from '../../constants/c4Notation';

// Fora do componente: o React Flow recria tudo se o objeto de tipos mudar a cada render
const NODE_TYPES = Object.fromEntries(Object.keys(C4_ELEMENTS).map((type) => [type, C4Node]));

// Notação oficial: relacionamento unidirecional, linha tracejada com seta no destino
const RELATIONSHIP_STYLE = { markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeDasharray: '6 4' } };

// Metade do tamanho aproximado do elemento: ao soltar, o cursor fica no centro dele, não no canto
const NODE_CENTER_OFFSET = { x: 100, y: 50 };

const DELETE_KEYS = ['Backspace', 'Delete'];

function DiagramWorkspace({ level, nodes, edges, onNodesChange, onEdgesChange, onConnect, onAddNode, onEditNode, onEditEdge }) {
  const { screenToFlowPosition } = useReactFlow();
  const dropAreaRef = useRef(null);
  const displayedEdges = useMemo(
    () => edges.map((edge) => ({ ...withTechnologyLabel(edge), ...RELATIONSHIP_STYLE })),
    [edges]
  );

  function addAt(type, screenPoint) {
    const position = screenToFlowPosition(screenPoint);
    onAddNode(type, { x: position.x - NODE_CENTER_OFFSET.x, y: position.y - NODE_CENTER_OFFSET.y });
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
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
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidRelationship}
          onNodeDoubleClick={(_, node) => onEditNode(node.id)}
          onEdgeDoubleClick={(_, edge) => onEditEdge(edge.id)}
          deleteKeyCode={DELETE_KEYS}
          zoomOnDoubleClick={false}
          colorMode="dark"
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>

        {nodes.length === 0 && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-text-muted">
            Este nível ainda não tem elementos. Arraste um elemento da paleta para começar.
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
