import { useCallback, useEffect, useRef, useState } from 'react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { listDiagrams, saveDiagram } from '../services/diagrams';
import {
  C4_ELEMENTS,
  DEFAULT_RELATIONSHIP_LABEL,
  LEVEL_IDS,
  MAX_EDGES,
  MAX_NODES,
  isAllowedInLevel,
  isValidRelationship,
} from '../constants/c4Notation';
import { fromApi, pickNodeData, toApi } from '../services/diagramMapper';

export const AUTOSAVE_DELAY_MS = 2000;

// Passos guardados por nível para desfazer (RF23)
const HISTORY_LIMIT = 50;
// Deslocamento de cada colagem sem posição, para as cópias não ficarem por cima dos originais
const PASTE_OFFSET = 40;

const STRUCTURAL_CHANGES = new Set(['add', 'remove', 'replace']);

// Nota: seleção e medição de tamanho não alteram o diagrama; mover só conta ao soltar o elemento
function changesDiagram(change) {
  if (STRUCTURAL_CHANGES.has(change.type)) return true;
  return change.type === 'position' && change.dragging === false && Boolean(change.position);
}

function emptyDiagrams() {
  return Object.fromEntries(LEVEL_IDS.map((level) => [level, { nodes: [], edges: [] }]));
}

function emptyHistory() {
  return Object.fromEntries(LEVEL_IDS.map((level) => [level, { past: [], future: [] }]));
}

function isDragStart(change) {
  return change.type === 'position' && change.dragging === true;
}

export function useDiagramEditor(projectId) {
  const [loadStatus, setLoadStatus] = useState('loading');
  const [diagrams, setDiagrams] = useState(emptyDiagrams);
  const [activeLevel, setActiveLevel] = useState('context');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [history, setHistory] = useState(emptyHistory);

  const diagramsRef = useRef(diagrams);
  const dirtyLevelsRef = useRef(new Set());
  const autosaveTimerRef = useRef(null);
  const inFlightSaveRef = useRef(null);
  const saveRequestedRef = useRef(false);
  const dragSnapshotRef = useRef(null);
  const clipboardRef = useRef(null);
  const pasteCountRef = useRef(0);
  const [hasClipboard, setHasClipboard] = useState(false);
  // Aviso curto para o usuário quando uma ação é bloqueada (ex.: limite de elementos do diagrama)
  const [notice, setNotice] = useState(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    diagramsRef.current = diagrams;
  }, [diagrams]);

  useEffect(() => {
    let active = true;

    listDiagrams(projectId)
      .then((saved) => {
        if (!active) return;
        const loaded = emptyDiagrams();
        saved.forEach(({ level, data }) => {
          if (loaded[level]) loaded[level] = fromApi(data);
        });
        setDiagrams(loaded);
        setLoadStatus('ready');
      })
      .catch(() => active && setLoadStatus('error'));

    return () => {
      active = false;
    };
  }, [projectId]);

  // Nota: salva os níveis alterados em paralelo (são registros independentes). Só os que falharem voltam
  // para a fila, e as alterações continuam em memória (RFC 3.2.2).
  const saveDirtyLevels = useCallback(async function saveRound() {
    saveRequestedRef.current = false;
    const levels = [...dirtyLevelsRef.current];
    dirtyLevelsRef.current.clear();
    setSaveStatus('saving');

    const results = await Promise.allSettled(
      levels.map((level) => saveDiagram(projectId, level, toApi(diagramsRef.current[level])))
    );
    const failedLevels = levels.filter((_, index) => results[index].status === 'rejected');

    if (failedLevels.length > 0) {
      failedLevels.forEach((level) => dirtyLevelsRef.current.add(level));
      setSaveStatus('error');
      return;
    }

    if (saveRequestedRef.current && dirtyLevelsRef.current.size > 0) {
      await saveRound();
      return;
    }

    setSaveStatus(dirtyLevelsRef.current.size > 0 ? 'pending' : 'saved');
  }, [projectId]);

  // Nota: um salvamento por vez — dois PUTs do mesmo nível em paralelo podem chegar fora de ordem e gravar
  // a versão antiga por cima da nova. Um pedido feito durante o salvamento roda logo depois dele.
  const save = useCallback(() => {
    clearTimeout(autosaveTimerRef.current);

    if (inFlightSaveRef.current) {
      saveRequestedRef.current = true;
      return inFlightSaveRef.current;
    }
    if (dirtyLevelsRef.current.size === 0) return Promise.resolve();

    inFlightSaveRef.current = saveDirtyLevels().finally(() => {
      inFlightSaveRef.current = null;
    });
    return inFlightSaveRef.current;
  }, [saveDirtyLevels]);

  const markDirty = useCallback(
    (level) => {
      dirtyLevelsRef.current.add(level);
      setSaveStatus('pending');
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        void save();
      }, AUTOSAVE_DELAY_MS);
    },
    [save]
  );

  // Nota: ao sair do editor, o que estiver pendente é salvo na hora
  useEffect(() => {
    const dirtyLevels = dirtyLevelsRef.current;
    return () => {
      if (dirtyLevels.size > 0) void save();
    };
  }, [save]);

  // Nota: cada passo guarda o diagrama de antes da alteração. Uma alteração nova descarta o que podia ser refeito.
  // Um passo igual ao anterior é ignorado: ao excluir pelo teclado, o React Flow avisa a remoção do elemento e a
  // das conexões em chamadas seguidas, antes de a tela atualizar.
  const record = useCallback((level, snapshot) => {
    setHistory((current) => {
      const { past } = current[level];
      if (past.at(-1) === snapshot) return current;
      return { ...current, [level]: { past: [...past, snapshot].slice(-HISTORY_LIMIT), future: [] } };
    });
  }, []);

  const updateActive = useCallback(
    (key, apply, changes) => {
      const before = diagramsRef.current[activeLevel];
      // Mover é um passo só: guarda a posição de antes de começar a arrastar
      if (!dragSnapshotRef.current && changes.some(isDragStart)) dragSnapshotRef.current = before;

      setDiagrams((current) => ({
        ...current,
        [activeLevel]: { ...current[activeLevel], [key]: apply(changes, current[activeLevel][key]) },
      }));

      if (changes.some(changesDiagram)) {
        record(activeLevel, dragSnapshotRef.current ?? before);
        dragSnapshotRef.current = null;
        markDirty(activeLevel);
      }
    },
    [activeLevel, markDirty, record]
  );

  const onNodesChange = useCallback((changes) => updateActive('nodes', applyNodeChanges, changes), [updateActive]);
  const onEdgesChange = useCallback((changes) => updateActive('edges', applyEdgeChanges, changes), [updateActive]);

  // Edições feitas pelo editor (paleta, conexões e modal): sempre alteram o diagrama do nível ativo
  const editActive = useCallback(
    (edit) => {
      record(activeLevel, diagramsRef.current[activeLevel]);
      setDiagrams((current) => ({ ...current, [activeLevel]: edit(current[activeLevel]) }));
      markDirty(activeLevel);
    },
    [activeLevel, markDirty, record]
  );

  const addNode = useCallback(
    (type, position) => {
      if (!isAllowedInLevel(activeLevel, type)) return;
      if (diagramsRef.current[activeLevel].nodes.length >= MAX_NODES) {
        setNotice(`O diagrama pode ter no máximo ${MAX_NODES} elementos.`);
        return;
      }
      const node = { id: crypto.randomUUID(), type, position, data: { label: C4_ELEMENTS[type].name } };
      editActive((diagram) => ({ ...diagram, nodes: [...diagram.nodes, node] }));
    },
    [activeLevel, editActive]
  );

  const connect = useCallback(
    ({ source, target }) => {
      if (!isValidRelationship({ source, target }, diagramsRef.current[activeLevel].edges)) return;
      const edge = { id: crypto.randomUUID(), source, target, label: DEFAULT_RELATIONSHIP_LABEL, data: {} };
      editActive((diagram) => ({ ...diagram, edges: [...diagram.edges, edge] }));
    },
    [activeLevel, editActive]
  );

  const updateNode = useCallback(
    (id, data) => {
      editActive((diagram) => ({
        ...diagram,
        nodes: diagram.nodes.map((node) => (node.id === id ? { ...node, data: pickNodeData(data) } : node)),
      }));
    },
    [editActive]
  );

  const updateEdge = useCallback(
    (id, { label, technology }) => {
      editActive((diagram) => ({
        ...diagram,
        edges: diagram.edges.map((edge) => (edge.id === id ? { ...edge, label, data: technology ? { technology } : {} } : edge)),
      }));
    },
    [editActive]
  );

  const removeNode = useCallback(
    (id) => {
      editActive(({ nodes, edges }) => ({
        nodes: nodes.filter((node) => node.id !== id),
        edges: edges.filter((edge) => edge.source !== id && edge.target !== id),
      }));
    },
    [editActive]
  );

  const removeEdge = useCallback(
    (id) => {
      editActive((diagram) => ({ ...diagram, edges: diagram.edges.filter((edge) => edge.id !== id) }));
    },
    [editActive]
  );

  // Exclui de uma vez os elementos e conexões selecionados (e as conexões dos elementos excluídos)
  const removeSelected = useCallback(() => {
    const { nodes, edges } = diagramsRef.current[activeLevel];
    if (!nodes.some((node) => node.selected) && !edges.some((edge) => edge.selected)) return;

    editActive((diagram) => {
      const removedIds = new Set(diagram.nodes.filter((node) => node.selected).map((node) => node.id));
      return {
        nodes: diagram.nodes.filter((node) => !node.selected),
        edges: diagram.edges.filter((edge) => !edge.selected && !removedIds.has(edge.source) && !removedIds.has(edge.target)),
      };
    });
  }, [activeLevel, editActive]);

  // Copiar e colar: a área de transferência fica na memória do editor (vale entre os níveis do projeto) e guarda
  // os elementos e só as relações entre eles. ids: os indicados (menu de clique direito) ou, sem eles, a seleção.
  const copy = useCallback(
    (ids) => {
      const { nodes, edges } = diagramsRef.current[activeLevel];
      const chosen = new Set(ids ?? nodes.filter((node) => node.selected).map((node) => node.id));
      if (chosen.size === 0) return false;

      clipboardRef.current = {
        nodes: nodes.filter((node) => chosen.has(node.id)).map(({ id, type, position, data }) => ({ id, type, position, data })),
        edges: edges
          .filter((edge) => chosen.has(edge.source) && chosen.has(edge.target))
          .map(({ id, source, target, label, data }) => ({ id, source, target, label, data })),
      };
      pasteCountRef.current = 0;
      setHasClipboard(true);
      return true;
    },
    [activeLevel]
  );

  // Cola cópias com ids novos, selecionando só elas (um passo do histórico). Sem posição, desloca um pouco mais a
  // cada colagem; com posição (clique direito no canvas), o canto do grupo vai para o ponto clicado. Em outro
  // nível, só entram os tipos permitidos nele (RN08).
  const paste = useCallback(
    (position) => {
      const clipboard = clipboardRef.current;
      const nodes = clipboard?.nodes.filter((node) => isAllowedInLevel(activeLevel, node.type)) ?? [];
      if (nodes.length === 0) return;

      // Colagem que passaria do tamanho máximo do diagrama não é feita (o salvamento falharia depois, sem explicação)
      const current = diagramsRef.current[activeLevel];
      const copiedIds = new Set(nodes.map((node) => node.id));
      const edgeCount = clipboard.edges.filter((edge) => copiedIds.has(edge.source) && copiedIds.has(edge.target)).length;
      if (current.nodes.length + nodes.length > MAX_NODES) {
        setNotice(`O diagrama pode ter no máximo ${MAX_NODES} elementos: a colagem não foi feita.`);
        return;
      }
      if (current.edges.length + edgeCount > MAX_EDGES) {
        setNotice(`O diagrama pode ter no máximo ${MAX_EDGES} relações: a colagem não foi feita.`);
        return;
      }

      pasteCountRef.current += 1;
      const offset = PASTE_OFFSET * pasteCountRef.current;
      const shift = position
        ? {
            x: position.x - Math.min(...nodes.map((node) => node.position.x)),
            y: position.y - Math.min(...nodes.map((node) => node.position.y)),
          }
        : { x: offset, y: offset };

      const newIds = new Map(nodes.map((node) => [node.id, crypto.randomUUID()]));
      const pastedNodes = nodes.map((node) => ({
        ...node,
        id: newIds.get(node.id),
        position: { x: node.position.x + shift.x, y: node.position.y + shift.y },
        data: { ...node.data },
        selected: true,
      }));
      const pastedEdges = clipboard.edges
        .filter((edge) => newIds.has(edge.source) && newIds.has(edge.target))
        .map((edge) => ({
          ...edge,
          id: crypto.randomUUID(),
          source: newIds.get(edge.source),
          target: newIds.get(edge.target),
          data: { ...edge.data },
        }));

      editActive((diagram) => ({
        nodes: [...diagram.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)), ...pastedNodes],
        edges: [...diagram.edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)), ...pastedEdges],
      }));
    },
    [activeLevel, editActive]
  );

  // Seleciona só o elemento ou a relação indicados (ex.: ao clicar num problema da validação). Seleção não é edição:
  // não entra no histórico nem marca o nível para salvar
  const selectOnly = useCallback(
    ({ nodeId, edgeId }) => {
      setDiagrams((current) => {
        const diagram = current[activeLevel];
        return {
          ...current,
          [activeLevel]: {
            nodes: diagram.nodes.map((node) => ({ ...node, selected: node.id === nodeId })),
            edges: diagram.edges.map((edge) => ({ ...edge, selected: edge.id === edgeId })),
          },
        };
      });
    },
    [activeLevel]
  );

  // Desfazer e refazer (RF23): trocam o diagrama do nível ativo pelo passo guardado e marcam para salvar
  const travel = useCallback(
    (from) => {
      const steps = history[activeLevel][from];
      if (steps.length === 0) return;

      const target = from === 'past' ? steps.at(-1) : steps[0];
      const current = diagramsRef.current[activeLevel];
      setHistory((state) => {
        const level = state[activeLevel];
        return {
          ...state,
          [activeLevel]:
            from === 'past'
              ? { past: level.past.slice(0, -1), future: [current, ...level.future] }
              : { past: [...level.past, current], future: level.future.slice(1) },
        };
      });
      setDiagrams((state) => ({ ...state, [activeLevel]: target }));
      markDirty(activeLevel);
    },
    [activeLevel, history, markDirty]
  );

  const undo = useCallback(() => travel('past'), [travel]);
  const redo = useCallback(() => travel('future'), [travel]);

  const selectLevel = useCallback(
    (level) => {
      if (dirtyLevelsRef.current.size > 0) void save();
      setActiveLevel(level);
    },
    [save]
  );

  return {
    loadStatus,
    activeLevel,
    selectLevel,
    nodes: diagrams[activeLevel].nodes,
    edges: diagrams[activeLevel].edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    connect,
    updateNode,
    updateEdge,
    removeNode,
    removeEdge,
    removeSelected,
    selectOnly,
    copy,
    paste,
    hasClipboard,
    notice,
    dismissNotice,
    hasSelection:
      diagrams[activeLevel].nodes.some((node) => node.selected) || diagrams[activeLevel].edges.some((edge) => edge.selected),
    undo,
    redo,
    canUndo: history[activeLevel].past.length > 0,
    canRedo: history[activeLevel].future.length > 0,
    save,
    saveStatus,
  };
}
