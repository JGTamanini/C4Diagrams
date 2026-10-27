import { useCallback, useEffect, useRef, useState } from 'react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { listDiagrams, saveDiagram } from '../services/diagrams';
import { C4_ELEMENTS, DEFAULT_RELATIONSHIP_LABEL, LEVEL_IDS, isAllowedInLevel, isValidRelationship } from '../constants/c4Notation';
import { fromApi, pickNodeData, toApi } from '../services/diagramMapper';

export const AUTOSAVE_DELAY_MS = 2000;

// Passos guardados por nível para desfazer (RF23)
const HISTORY_LIMIT = 50;

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
