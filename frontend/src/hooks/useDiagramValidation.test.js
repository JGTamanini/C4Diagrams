import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDiagramValidation, VALIDATION_DELAY_MS } from './useDiagramValidation';
import { validateDiagram } from '../services/diagrams';

vi.mock('../services/diagrams');

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const nodes = [
  { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
  { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja' } },
];
const edges = [{ id: 'e1', source: 'n1', target: 'n2', label: 'Usa', data: {} }];
const issues = [{ code: 'MISSING_DESCRIPTION', severity: 'info', nodeId: 'n1', message: '"Cliente" não tem descrição.' }];

function renderValidation(initial = { level: 'context', nodes, edges }) {
  return renderHook((props) => useDiagramValidation(PROJECT_ID, props.level, props.nodes, props.edges), {
    initialProps: initial,
  });
}

async function waitDelay() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(VALIDATION_DELAY_MS);
  });
}

describe('useDiagramValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    validateDiagram.mockResolvedValue(issues);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve validar o estado atual do nível pouco depois de abrir, no formato da API', async () => {
    const { result } = renderValidation();
    expect(validateDiagram).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'validating', issues: [] });

    await waitDelay();

    expect(validateDiagram).toHaveBeenCalledWith(PROJECT_ID, 'context', {
      nodes: [
        { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
        { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Usa' }],
    });
    expect(result.current).toEqual({ status: 'ready', issues });
  });

  it('deve esperar a edição parar (uma chamada só para mudanças seguidas)', async () => {
    const { rerender } = renderValidation();
    await waitDelay();
    validateDiagram.mockClear();

    rerender({ level: 'context', nodes: [...nodes, { id: 'n3', type: 'c4-system-external', position: { x: 0, y: 0 }, data: { label: 'A' } }], edges });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VALIDATION_DELAY_MS / 2);
    });
    rerender({ level: 'context', nodes: [...nodes, { id: 'n3', type: 'c4-system-external', position: { x: 0, y: 0 }, data: { label: 'AB' } }], edges });
    await waitDelay();

    expect(validateDiagram).toHaveBeenCalledTimes(1);
  });

  it('não deve validar de novo quando só mudam posição ou seleção (as regras não dependem disso)', async () => {
    const { rerender } = renderValidation();
    await waitDelay();
    validateDiagram.mockClear();

    const moved = nodes.map((node) => ({ ...node, position: { x: node.position.x + 50, y: 10 }, selected: true }));
    rerender({ level: 'context', nodes: moved, edges: edges.map((edge) => ({ ...edge, selected: true })) });
    await waitDelay();

    expect(validateDiagram).not.toHaveBeenCalled();
  });

  it('deve validar de novo ao trocar de nível', async () => {
    const { rerender } = renderValidation();
    await waitDelay();

    rerender({ level: 'container', nodes, edges });
    await waitDelay();

    expect(validateDiagram).toHaveBeenLastCalledWith(PROJECT_ID, 'container', expect.any(Object));
  });

  it('deve descartar uma resposta antiga que chegue depois da mais nova', async () => {
    let resolveOld;
    validateDiagram.mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)));
    const newer = [{ code: 'CONTEXT_WITHOUT_PERSON', severity: 'warning', message: 'Sem Pessoa.' }];
    validateDiagram.mockResolvedValueOnce(newer);
    const { result, rerender } = renderValidation();
    await waitDelay();

    rerender({ level: 'context', nodes: nodes.slice(1), edges: [] });
    await waitDelay();
    await act(async () => resolveOld(issues));

    expect(result.current.issues).toEqual(newer);
  });

  it('deve indicar falha sem apagar a última lista válida, e validar de novo na próxima mudança', async () => {
    const { result, rerender } = renderValidation();
    await waitDelay();
    validateDiagram.mockRejectedValueOnce(new Error('Network Error'));

    rerender({ level: 'context', nodes: [nodes[0], { ...nodes[1], data: { label: 'Loja 2' } }], edges });
    await waitDelay();

    expect(result.current).toEqual({ status: 'error', issues });
  });

  it('deve tirar na hora os problemas de elementos e relações excluídos, sem esperar a nova validação', async () => {
    validateDiagram.mockResolvedValue([
      { code: 'MISSING_DESCRIPTION', severity: 'info', nodeId: 'n1', message: 'n1' },
      { code: 'MISSING_TECHNOLOGY', severity: 'info', edgeId: 'e1', message: 'e1' },
      { code: 'MISSING_DESCRIPTION', severity: 'info', nodeId: 'n2', message: 'n2' },
      { code: 'CONTEXT_WITHOUT_PERSON', severity: 'warning', message: 'diagrama' },
    ]);
    const { result, rerender } = renderValidation();
    await waitDelay();

    rerender({ level: 'context', nodes: [nodes[1]], edges: [] });

    expect(result.current.issues.map((issue) => issue.message)).toEqual(['n2', 'diagrama']);
  });

  it('não deve validar um nível vazio (não há o que conferir)', async () => {
    const { result } = renderValidation({ level: 'context', nodes: [], edges: [] });
    await waitDelay();

    expect(validateDiagram).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'ready', issues: [] });
  });
});
