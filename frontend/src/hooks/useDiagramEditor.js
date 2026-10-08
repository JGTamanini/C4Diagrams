import { useCallback, useEffect, useRef, useState } from 'react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { listDiagrams, saveDiagram } from '../services/diagrams';
import { LEVEL_IDS } from '../constants/c4Notation';

export const AUTOSAVE_DELAY_MS = 2000;

const STRUCTURAL_CHANGES = ['add', 'remove', 'replace'];

// Nota: seleção e medição de tamanho não alteram o diagrama; mover só conta ao soltar o elemento
function changesDiagram(change) {
  if (STRUCTURAL_CHANGES.includes(change.type)) return true;
  return change.type === 'position' && change.dragging === false && Boolean(change.position);
}

function emptyDiagrams() {
  return Object.fromEntries(LEVEL_IDS.map((level) => [level, { nodes: [], edges: [] }]));
}

// API → React Flow: a tecnologia da conexão vai para edge.data
function fromApi(data) {
  return {
    nodes: data.nodes,
    edges: data.edges.map(({ technology, ...edge }) => ({ ...edge, data: technology ? { technology } : {} })),
  };
}

function pickNodeData({ label, description, technology }) {
  return {
    label,
    ...(description ? { description } : {}),
    ...(technology ? { technology } : {}),
  };
}

// React Flow → API: só os campos do documento (o estado interno do React Flow fica de fora).
// Conexões cujo elemento foi removido são descartadas para não enviar um documento inválido.
function toApi({ nodes, edges }) {
  const nodeIds = new Set(nodes.map((node) => node.id));

  return {
    nodes: nodes.map(({ id, type, position, data }) => ({
      id,
      type,
      position: { x: position.x, y: position.y },
      data: pickNodeData(data),
    })),
    edges: edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map(({ id, source, target, label, data }) => ({
        id,
        source,
        target,
        label,
        ...(data?.technology ? { technology: data.technology } : {}),
      })),
  };
}

export function useDiagramEditor(projectId) {
  const [loadStatus, setLoadStatus] = useState('loading');
  const [diagrams, setDiagrams] = useState(emptyDiagrams);
  const [activeLevel, setActiveLevelState] = useState('context');
  const [saveStatus, setSaveStatus] = useState('saved');

  const diagramsRef = useRef(diagrams);
  const dirtyLevelsRef = useRef(new Set());
  const autosaveTimerRef = useRef(null);

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

  // Nota: salva os níveis alterados; em falha, mantém tudo em memória e marca de novo para salvar (RFC 3.2.2)
  const save = useCallback(async () => {
    clearTimeout(autosaveTimerRef.current);
    const levels = [...dirtyLevelsRef.current];
    if (levels.length === 0) return;

    dirtyLevelsRef.current.clear();
    setSaveStatus('saving');

    try {
      for (const level of levels) {
        await saveDiagram(projectId, level, toApi(diagramsRef.current[level]));
      }
      setSaveStatus(dirtyLevelsRef.current.size > 0 ? 'pending' : 'saved');
    } catch {
      levels.forEach((level) => dirtyLevelsRef.current.add(level));
      setSaveStatus('error');
    }
  }, [projectId]);

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

  const setActiveLevel = useCallback(
    (level) => {
      if (dirtyLevelsRef.current.size > 0) void save();
      setActiveLevelState(level);
    },
    [save]
  );

  return {
    loadStatus,
    activeLevel,
    setActiveLevel,
    nodes: diagrams[activeLevel].nodes,
    edges: diagrams[activeLevel].edges,
    onNodesChange,
    onEdgesChange,
    save,
    saveStatus,
  };
}
