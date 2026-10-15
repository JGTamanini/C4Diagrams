import { useCallback, useEffect, useRef, useState } from 'react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { listDiagrams, saveDiagram } from '../services/diagrams';
import { C4_ELEMENTS, DEFAULT_RELATIONSHIP_LABEL, LEVEL_IDS, isAllowedInLevel, isValidRelationship } from '../constants/c4Notation';
import { fromApi, pickNodeData, toApi } from '../services/diagramMapper';

export const AUTOSAVE_DELAY_MS = 2000;

const STRUCTURAL_CHANGES = new Set(['add', 'remove', 'replace']);

// Nota: seleção e medição de tamanho não alteram o diagrama; mover só conta ao soltar o elemento
function changesDiagram(change) {
  if (STRUCTURAL_CHANGES.has(change.type)) return true;
  return change.type === 'position' && change.dragging === false && Boolean(change.position);
}

function emptyDiagrams() {
  return Object.fromEntries(LEVEL_IDS.map((level) => [level, { nodes: [], edges: [] }]));
}

export function useDiagramEditor(projectId) {
  const [loadStatus, setLoadStatus] = useState('loading');
  const [diagrams, setDiagrams] = useState(emptyDiagrams);
  const [activeLevel, setActiveLevel] = useState('context');
  const [saveStatus, setSaveStatus] = useState('saved');

  const diagramsRef = useRef(diagrams);
  const dirtyLevelsRef = useRef(new Set());
  const autosaveTimerRef = useRef(null);
  const inFlightSaveRef = useRef(null);
  const saveRequestedRef = useRef(false);

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

  const updateActive = useCallback(
    (key, apply, changes) => {
      setDiagrams((current) => ({
        ...current,
        [activeLevel]: { ...current[activeLevel], [key]: apply(changes, current[activeLevel][key]) },
      }));
      if (changes.some(changesDiagram)) markDirty(activeLevel);
    },
    [activeLevel, markDirty]
  );

  const onNodesChange = useCallback((changes) => updateActive('nodes', applyNodeChanges, changes), [updateActive]);
  const onEdgesChange = useCallback((changes) => updateActive('edges', applyEdgeChanges, changes), [updateActive]);

  // Edições feitas pelo editor (paleta, conexões e modal): sempre alteram o diagrama do nível ativo
  const editActive = useCallback(
    (edit) => {
      setDiagrams((current) => ({ ...current, [activeLevel]: edit(current[activeLevel]) }));
      markDirty(activeLevel);
    },
    [activeLevel, markDirty]
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
      if (!isValidRelationship({ source, target })) return;
      const edge = { id: crypto.randomUUID(), source, target, label: DEFAULT_RELATIONSHIP_LABEL, data: {} };
      editActive((diagram) => ({ ...diagram, edges: [...diagram.edges, edge] }));
    },
    [editActive]
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
    save,
    saveStatus,
  };
}
