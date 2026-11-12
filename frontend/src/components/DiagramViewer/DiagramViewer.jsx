import { useEffect, useMemo } from 'react';
import { Minus, Plus, Scan } from 'lucide-react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ControlButton,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ScopeBoundary from '../ScopeBoundary/ScopeBoundary';
import DiagramLegend from '../DiagramLegend/DiagramLegend';
import {
  EDGE_TYPES,
  FIT_VIEW_OPTIONS,
  GRID_GAP,
  NODE_TYPES,
  ZOOM_ANIMATION,
  displayEdges,
} from '../DiagramCanvas/diagramDisplay';

const ARIA_LABELS = { 'controls.ariaLabel': 'Controles da visualização' };

// Só o que ajuda a ler: aproximar, afastar e enquadrar
function ViewerControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Controls position="bottom-center" orientation="horizontal" showZoom={false} showFitView={false} showInteractive={false}>
      <ControlButton aria-label="Afastar" title="Afastar" onClick={() => void zoomOut(ZOOM_ANIMATION)}>
        <Minus aria-hidden="true" />
      </ControlButton>
      <ControlButton aria-label="Aproximar" title="Aproximar" onClick={() => void zoomIn(ZOOM_ANIMATION)}>
        <Plus aria-hidden="true" />
      </ControlButton>
      <ControlButton aria-label="Enquadrar o diagrama" title="Enquadrar o diagrama" onClick={() => void fitView({ ...FIT_VIEW_OPTIONS, ...ZOOM_ANIMATION })}>
        <Scan aria-hidden="true" />
      </ControlButton>
    </Controls>
  );
}

// Quadros a esperar pela medição de todos os elementos antes de enquadrar mesmo assim (~0,5 s)
const MAX_FIT_ATTEMPTS = 30;

// Enquadra o nível quando todos os elementos já têm tamanho medido, conferindo quadro a quadro (como no editor): os
// elementos são medidos aos poucos, e enquadrar antes deixaria o diagrama no tamanho real, cortado. Cada nível tem o
// próprio provider (key), então enquadra também ao trocar de aba.
function FitWhenMeasured() {
  const { fitView, getNodes, getInternalNode } = useReactFlow();
  useEffect(() => {
    let frame;
    let attempts = 0;
    const fitWhenMeasured = () => {
      const nodes = getNodes();
      const measured = nodes.length > 0 && nodes.every((node) => getInternalNode(node.id)?.measured?.width);
      if (measured || attempts >= MAX_FIT_ATTEMPTS) {
        void fitView(FIT_VIEW_OPTIONS);
        return;
      }
      attempts += 1;
      frame = requestAnimationFrame(fitWhenMeasured);
    };
    frame = requestAnimationFrame(fitWhenMeasured);
    return () => cancelAnimationFrame(frame);
  }, [fitView, getNodes, getInternalNode]);
  return null;
}

// Nota: visualização só leitura do link compartilhado — a mesma notação do editor (elementos, relações, fronteira e
// legenda), com zoom e arraste da visão, mas sem mover, conectar ou editar nada. Clicar num elemento avisa a página
// (que abre os detalhes) e o destaca; clicar no fundo fecha.
function DiagramViewer({ level, nodes, edges, boundary = null, selectedId = null, onSelectElement }) {
  const shownEdges = useMemo(() => displayEdges(edges), [edges]);
  const shownNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedId,
        ...(onSelectElement ? { className: 'cursor-pointer' } : {}),
      })),
    [nodes, selectedId, onSelectElement]
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">Este nível ainda não tem diagrama.</p>
      </div>
    );
  }

  return (
    // Um provider por nível: com o mesmo provider, a troca de nível herdaria as medidas do anterior e enquadraria cedo
    <ReactFlowProvider key={level}>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          edgesFocusable={false}
          nodesFocusable={false}
          zoomOnDoubleClick={false}
          minZoom={0.1}
          colorMode="dark"
          ariaLabelConfig={ARIA_LABELS}
          onNodeClick={(_event, node) => onSelectElement?.(node.id)}
          onPaneClick={() => onSelectElement?.(null)}
        >
          <Background gap={GRID_GAP} size={2} />
          <ScopeBoundary boundary={boundary} />
          <ViewerControls />
          <FitWhenMeasured />
        </ReactFlow>
        <div className="pointer-events-none absolute right-3 bottom-3 z-10">
          <DiagramLegend nodes={nodes} edges={edges} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default DiagramViewer;
