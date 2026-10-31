import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ClipboardPaste, Copy, MousePointerClick, PanelLeftOpen, Pencil, Trash2 } from 'lucide-react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ConnectionMode,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import C4Node from '../C4Node/C4Node';
import ElementPalette, { ELEMENT_DRAG_TYPE, PALETTE_OFFSET } from '../ElementPalette/ElementPalette';
import IconButton from '../Button/IconButton';
import ContextMenu from '../ContextMenu/ContextMenu';
import ElementTree from '../ElementTree/ElementTree';
import ColumnSplitter from '../ColumnSplitter/ColumnSplitter';
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

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Enquadramento: mostra o diagrama inteiro, mas sem aproximar além do tamanho real quando há poucos elementos
const FIT_VIEW_OPTIONS = { maxZoom: 1, padding: 0.25 };
// Alturas mínimas ao ajustar a divisória: a paleta mostra sempre o título e uma fileira inteira (o resto rola)
const PALETTE_MIN_HEIGHT = 190;
const TREE_MIN_HEIGHT = 120;

// Ao focar um problema da validação: aproxima o alvo sem passar do tamanho real, com folga em volta
const FOCUS_OPTIONS = { maxZoom: 1, padding: 0.6, duration: 300 };

// Só erro e aviso marcam o canvas; as sugestões (info) ficam só no painel, para o diagrama não ficar poluído
const MARKED_SEVERITIES = ['error', 'warning'];
const SEVERITY_COLOR = { error: 'var(--color-danger)', warning: 'var(--color-warning)' };

// Gravidade mais alta por elemento e por relação (um erro prevalece sobre um aviso no mesmo alvo)
function severityByTarget(issues, key) {
  const result = new Map();
  for (const issue of issues) {
    const target = issue[key];
    if (!target || !MARKED_SEVERITIES.includes(issue.severity)) continue;
    if (result.get(target) !== 'error') result.set(target, issue.severity);
  }
  return result;
}

// Quadros a esperar pela medição dos elementos antes de enquadrar mesmo assim (~0,5 s)
const MAX_FIT_ATTEMPTS = 30;

// keyboardEnabled: desligado com um modal aberto — senão o Delete apagaria os selecionados por trás dele
function DiagramWorkspace({
  level,
  nodes,
  edges,
  keyboardEnabled = true,
  paletteOpen = true,
  canPaste = false,
  issues = [],
  focusRequest = null,
  rightInset = 0,
  rightObstacle = null,
  nodesByLevel = null,
  onSelectTreeElement,
  onTogglePalette,
  onCopyNodes,
  onPaste,
  onRemoveNode,
  onRemoveSelected,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddNode,
  onEditNode,
  onEditEdge,
}) {
  const { screenToFlowPosition, fitView, getNodes, getInternalNode } = useReactFlow();
  const dropAreaRef = useRef(null);
  const paletteRef = useRef(null);
  const fittedLevelRef = useRef(null);
  // Foco pedido antes de o nível terminar de ser enquadrado (ex.: clique na árvore que troca de nível): fica
  // guardado e é aplicado no lugar do enquadramento do nível inteiro
  const pendingFocusRef = useRef(null);
  const edgesRef = useRef(edges);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Elementos a centralizar: o do problema ou os dois lados da relação
  function focusTargets(request) {
    const edge = request.edgeId && edgesRef.current.find((candidate) => candidate.id === request.edgeId);
    const ids = edge ? [edge.source, edge.target] : [request.nodeId].filter(Boolean);
    return ids.map((nodeId) => ({ id: nodeId }));
  }

  // Nota: enquadra cada nível ao abri-lo, esperando (quadro a quadro, com limite) o React Flow medir os elementos
  // desse nível. O provider sobrevive à troca de nível, e o fitView automático enquadrava com as medidas antigas.
  useEffect(() => {
    if (fittedLevelRef.current === level || nodes.length === 0) return undefined;

    let frame;
    let attempts = 0;
    const fitWhenMeasured = () => {
      const current = getNodes();
      const measured = current.length > 0 && current.every((node) => getInternalNode(node.id)?.measured?.width);
      if (measured || attempts >= MAX_FIT_ATTEMPTS) {
        fittedLevelRef.current = level;
        const pending = pendingFocusRef.current && focusTargets(pendingFocusRef.current);
        pendingFocusRef.current = null;
        void fitView(pending?.length ? { ...FOCUS_OPTIONS, nodes: pending } : FIT_VIEW_OPTIONS);
        return;
      }
      attempts += 1;
      frame = requestAnimationFrame(fitWhenMeasured);
    };

    frame = requestAnimationFrame(fitWhenMeasured);
    return () => cancelAnimationFrame(frame);
  }, [level, nodes.length, fitView, getNodes, getInternalNode]);
  // Nota: só para exibição — tipo flutuante e deslocamento das relações paralelas não vão para a API
  // Marcas da validação (RF17): só para exibição — não vão para o estado do editor nem para a API
  const displayedNodes = useMemo(() => {
    const severities = severityByTarget(issues, 'nodeId');
    return nodes.map((node) =>
      severities.has(node.id) ? { ...node, data: { ...node.data, issueSeverity: severities.get(node.id) } } : node
    );
  }, [nodes, issues]);

  const displayedEdges = useMemo(() => {
    const offsets = parallelOffsets(edges);
    const severities = severityByTarget(issues, 'edgeId');
    return edges.map((edge) => ({
      ...withTechnologyLabel(edge),
      ...RELATIONSHIP_STYLE,
      ...(severities.has(edge.id) ? { labelBgStyle: { stroke: SEVERITY_COLOR[severities.get(edge.id)], strokeWidth: 1.5 } } : {}),
      type: 'floating',
      data: { ...edge.data, offset: offsets.get(edge.id) },
    }));
  }, [edges, issues]);

  // Foco pedido pelo painel de validação ou pela árvore: centraliza o alvo. Se o nível ainda não foi enquadrado (acabou
  // de trocar), o foco espera e substitui o enquadramento do nível inteiro
  useEffect(() => {
    if (!focusRequest) return;
    if (fittedLevelRef.current !== level) {
      pendingFocusRef.current = focusRequest;
      return;
    }
    const targets = focusTargets(focusRequest);
    if (targets.length > 0) void fitView({ ...FOCUS_OPTIONS, nodes: targets });
    // Só um pedido novo de foco move a visão — editar o diagrama depois não deve recentralizar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  function addAt(type, screenPoint) {
    const position = screenToFlowPosition(screenPoint);
    onAddNode(type, { x: position.x - NODE_CENTER_OFFSET.x, y: position.y - NODE_CENTER_OFFSET.y });
  }

  // A paleta flutua dentro da área de soltar: soltar de volta em cima dela é desistir do arraste, e não pode criar
  // um elemento escondido debaixo dela
  function isOverPalette(event) {
    return Boolean(paletteRef.current?.contains(event.target));
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = isOverPalette(event) ? 'none' : 'move';
  }

  function handleDrop(event) {
    event.preventDefault();
    if (isOverPalette(event)) return;
    const type = event.dataTransfer.getData(ELEMENT_DRAG_TYPE);
    if (!isAllowedInLevel(level, type)) return;
    addAt(type, { x: event.clientX, y: event.clientY });
  }

  // Menu de clique direito: num elemento (age nele ou, se ele estiver selecionado, em toda a seleção) ou no fundo
  // do canvas (colar no ponto clicado)
  const [contextMenu, setContextMenu] = useState(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  // Fecha o menu quando o usuário move o canvas; movimentos automáticos (ex.: o enquadramento do nível, que roda
  // logo depois de medir os elementos) chegam sem evento e não devem fechar um menu recém-aberto
  const closeOnUserMove = useCallback((event) => {
    if (event) setContextMenu(null);
  }, []);

  function openContextMenu(event, node) {
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY };
    setContextMenu({ ...point, flowPosition: screenToFlowPosition(point), node });
  }

  function contextMenuItems() {
    const paste = {
      label: 'Colar',
      icon: ClipboardPaste,
      hint: 'Ctrl+V',
      disabled: !canPaste,
      onSelect: () => onPaste(contextMenu.flowPosition),
    };
    const { node } = contextMenu;
    if (!node) return [paste];

    const selectedIds = nodes.filter((candidate) => candidate.selected).map((candidate) => candidate.id);
    const actsOnSelection = selectedIds.includes(node.id);
    return [
      { label: 'Copiar', icon: Copy, hint: 'Ctrl+C', onSelect: () => onCopyNodes(actsOnSelection ? selectedIds : [node.id]) },
      paste,
      { label: 'Editar', icon: Pencil, onSelect: () => onEditNode(node.id) },
      {
        label: 'Excluir',
        icon: Trash2,
        hint: 'Delete',
        tone: 'danger',
        onSelect: () => (actsOnSelection ? onRemoveSelected() : onRemoveNode(node.id)),
      },
    ];
  }

  // Divisória entre a paleta e a árvore: null = altura automática da paleta (até o usuário ajustar)
  const [paletteHeight, setPaletteHeight] = useState(null);
  const paletteBoxRef = useRef(null);
  const showTree = Boolean(nodesByLevel && onSelectTreeElement);
  const maxPaletteHeight = () =>
    Math.max(PALETTE_MIN_HEIGHT, (paletteRef.current?.getBoundingClientRect().height ?? 0) - TREE_MIN_HEIGHT);

  // Clique na paleta: adiciona no centro da parte visível do canvas (descontando a paleta aberta por cima)
  function handlePaletteAdd(type) {
    const area = dropAreaRef.current.getBoundingClientRect();
    const covered = paletteOpen ? PALETTE_OFFSET : 0;
    addAt(type, { x: area.left + covered + (area.width - covered) / 2, y: area.top + area.height / 2 });
  }

  return (
    <div className="h-full w-full">
      {/* O canvas ocupa a área toda; paleta, abas, dicas e legenda flutuam por cima dele */}
      <div
        ref={dropAreaRef}
        data-testid="diagram-drop-area"
        className="relative h-full w-full"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          key={level}
          nodes={displayedNodes}
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
          onNodeContextMenu={openContextMenu}
          onPaneContextMenu={(event) => openContextMenu(event, null)}
          // Depois de uma seleção em caixa (Shift + arrastar), o React Flow põe um retângulo por cima dos selecionados,
          // e o clique direito cai nele, não no elemento: o menu abre igual, agindo sobre toda a seleção
          onSelectionContextMenu={(event, selectedNodes) => openContextMenu(event, selectedNodes[0])}
          onMoveStart={closeOnUserMove}
          deleteKeyCode={keyboardEnabled ? DELETE_KEYS : null}
          connectionLineComponent={FloatingConnectionLine}
          connectionRadius={36}
          zoomOnDoubleClick={false}
          colorMode="dark"
        >
          <Background gap={22} size={1.4} />
          <Controls showInteractive={false} fitViewOptions={FIT_VIEW_OPTIONS} />
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
            className="pointer-events-none absolute bottom-4 left-16 z-10 rounded-full border border-line-subtle bg-surface/85 px-4 py-1.5 text-[11px] text-text-muted backdrop-blur-sm"
          >
            Duplo clique para editar · Arraste de um ponto de conexão até outro elemento · Delete exclui
          </p>
        )}

        <DiagramLegend nodes={nodes} edges={edges} rightInset={rightInset} rightObstacle={rightObstacle} />

        {contextMenu && (
          <ContextMenu
            label={contextMenu.node ? 'Ações do elemento' : 'Ações do canvas'}
            position={contextMenu}
            items={contextMenuItems()}
            onClose={closeContextMenu}
          />
        )}

        {/* Paleta recolhível: desliza para a esquerda ao ocultar e dá lugar a um botão discreto para reabri-la */}
        <AnimatePresence initial={false} mode="wait">
          {paletteOpen ? (
            <motion.div
              ref={paletteRef}
              key="palette"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT_SOFT }}
              // A coluna da paleta deixa passar os cliques (zoom, canvas); só a paleta em si recebe clique
              className="pointer-events-none absolute top-3 bottom-28 left-3 z-20 flex w-56 flex-col"
            >
              <div
                ref={paletteBoxRef}
                style={paletteHeight ? { height: paletteHeight } : undefined}
                className="pointer-events-none flex min-h-0 flex-col"
              >
                <ElementPalette level={level} onAdd={handlePaletteAdd} onCollapse={onTogglePalette} />
              </div>
              {showTree && (
                <>
                  <ColumnSplitter
                    label="Ajustar a divisão entre elementos e estrutura"
                    value={paletteHeight}
                    min={PALETTE_MIN_HEIGHT}
                    getMax={maxPaletteHeight}
                    getStartValue={() => paletteBoxRef.current?.getBoundingClientRect().height ?? PALETTE_MIN_HEIGHT}
                    onChange={setPaletteHeight}
                  />
                  <div className="pointer-events-none flex min-h-0 flex-1 flex-col">
                    <ElementTree nodesByLevel={nodesByLevel} activeLevel={level} onSelectElement={onSelectTreeElement} />
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="palette-toggle"
              initial={{ x: -12, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -12, opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT_SOFT }}
              className="absolute top-3 left-3 z-20"
            >
              <IconButton
                icon={PanelLeftOpen}
                label="Mostrar elementos"
                onClick={onTogglePalette}
                className="border border-line bg-surface/90 shadow-[var(--shadow-raised)] backdrop-blur-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>
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
