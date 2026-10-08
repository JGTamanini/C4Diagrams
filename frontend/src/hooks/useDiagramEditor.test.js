import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDiagramEditor, AUTOSAVE_DELAY_MS } from './useDiagramEditor';
import { listDiagrams, saveDiagram } from '../services/diagrams';

vi.mock('../services/diagrams');

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const savedContext = {
  level: 'context',
  data: {
    nodes: [
      { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
      { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja' } },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em', technology: 'HTTPS' }],
  },
};

async function renderLoadedEditor() {
  const hook = renderHook(() => useDiagramEditor(PROJECT_ID));
  await waitFor(() => expect(hook.result.current.loadStatus).toBe('ready'));
  return hook;
}

function dragEnd(result, id, position) {
  act(() => {
    result.current.onNodesChange([{ type: 'position', id, position, dragging: false }]);
  });
}

async function advanceAutosave() {
  await act(async () => {
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
  });
}

describe('useDiagramEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    listDiagrams.mockResolvedValue([savedContext]);
    saveDiagram.mockResolvedValue({ level: 'context' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carregamento', () => {
    it('deve carregar os níveis salvos, com os vazios prontos para edição, começando pelo Contexto', async () => {
      const { result } = await renderLoadedEditor();

      expect(listDiagrams).toHaveBeenCalledWith(PROJECT_ID);
      expect(result.current.activeLevel).toBe('context');
      expect(result.current.nodes.map((n) => n.id)).toEqual(['n1', 'n2']);
      expect(result.current.edges[0]).toMatchObject({ id: 'e1', label: 'Compra em', data: { technology: 'HTTPS' } });
      expect(result.current.saveStatus).toBe('saved');

      act(() => result.current.setActiveLevel('container'));
      expect(result.current.nodes).toEqual([]);
    });

    it('deve sinalizar falha ao carregar', async () => {
      listDiagrams.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useDiagramEditor(PROJECT_ID));

      await waitFor(() => expect(result.current.loadStatus).toBe('error'));
    });
  });

  describe('salvamento automático (RNF08)', () => {
    it('não deve tratar seleção de elemento como alteração', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.onNodesChange([{ type: 'select', id: 'n1', selected: true }]));
      await advanceAutosave();

      expect(result.current.saveStatus).toBe('saved');
      expect(saveDiagram).not.toHaveBeenCalled();
    });

    it('deve salvar o nível 2 segundos após mover um elemento, enviando o documento sem estado interno', async () => {
      const { result } = await renderLoadedEditor();

      dragEnd(result, 'n1', { x: 50, y: 60 });
      expect(result.current.saveStatus).toBe('pending');
      expect(saveDiagram).not.toHaveBeenCalled();

      await advanceAutosave();

      expect(saveDiagram).toHaveBeenCalledTimes(1);
      expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'context', {
        nodes: [
          { id: 'n1', type: 'c4-person', position: { x: 50, y: 60 }, data: { label: 'Cliente' } },
          { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja' } },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em', technology: 'HTTPS' }],
      });
      await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
    });

    it('deve agrupar várias alterações seguidas em um único salvamento', async () => {
      const { result } = await renderLoadedEditor();

      dragEnd(result, 'n1', { x: 10, y: 10 });
      await act(async () => vi.advanceTimersByTime(1000));
      dragEnd(result, 'n1', { x: 20, y: 20 });
      await advanceAutosave();

      expect(saveDiagram).toHaveBeenCalledTimes(1);
    });

    it('deve salvar ao remover uma conexão, mas não ao apenas selecioná-la', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.onEdgesChange([{ type: 'select', id: 'e1', selected: true }]));
      await advanceAutosave();
      expect(saveDiagram).not.toHaveBeenCalled();

      act(() => result.current.onEdgesChange([{ type: 'remove', id: 'e1' }]));
      await advanceAutosave();

      expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'context', expect.objectContaining({ edges: [] }));
    });

    it('deve salvar o nível vazio quando o último elemento for removido', async () => {
      listDiagrams.mockResolvedValue([
        { level: 'context', data: { nodes: [savedContext.data.nodes[0]], edges: [] } },
      ]);
      const { result } = await renderLoadedEditor();

      act(() => result.current.onNodesChange([{ type: 'remove', id: 'n1' }]));
      await advanceAutosave();

      expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'context', { nodes: [], edges: [] });
    });

    it('deve sinalizar falha sem perder as alterações em memória (RFC 3.2.2)', async () => {
      saveDiagram.mockRejectedValue(new Error('Network Error'));
      const { result } = await renderLoadedEditor();

      dragEnd(result, 'n1', { x: 50, y: 60 });
      await advanceAutosave();

      await waitFor(() => expect(result.current.saveStatus).toBe('error'));
      expect(result.current.nodes[0].position).toEqual({ x: 50, y: 60 });
    });
  });

  describe('documento enviado e casos de borda', () => {
    it('deve enviar descrição e tecnologia, e descartar conexões de elementos removidos', async () => {
      listDiagrams.mockResolvedValue([
        {
          level: 'container',
          data: {
            nodes: [
              { id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API', description: 'Regras', technology: 'Node.js' } },
              { id: 'c2', type: 'c4-container-db', position: { x: 0, y: 200 }, data: { label: 'Banco', technology: 'PostgreSQL' } },
              { id: 'c3', type: 'c4-person', position: { x: 0, y: -200 }, data: { label: 'Cliente' } },
            ],
            edges: [
              { id: 'e1', source: 'c1', target: 'c2', label: 'Lê e grava' },
              { id: 'e2', source: 'c3', target: 'c1', label: 'Usa' },
            ],
          },
        },
        { level: 'code', data: { nodes: [], edges: [] } },
      ]);
      const { result } = await renderLoadedEditor();
      act(() => result.current.setActiveLevel('container'));

      act(() => result.current.onNodesChange([{ type: 'remove', id: 'c3' }]));
      await advanceAutosave();

      expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'container', {
        nodes: [
          { id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API', description: 'Regras', technology: 'Node.js' } },
          { id: 'c2', type: 'c4-container-db', position: { x: 0, y: 200 }, data: { label: 'Banco', technology: 'PostgreSQL' } },
        ],
        edges: [{ id: 'e1', source: 'c1', target: 'c2', label: 'Lê e grava' }],
      });
    });

    it('deve manter "pendente" quando houver alteração durante um salvamento em andamento', async () => {
      let finishSave;
      saveDiagram.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
      const { result } = await renderLoadedEditor();
      dragEnd(result, 'n1', { x: 50, y: 60 });

      let saving;
      act(() => {
        saving = result.current.save();
      });
      dragEnd(result, 'n2', { x: 400, y: 0 });
      await act(async () => {
        finishSave({});
        await saving;
      });

      expect(result.current.saveStatus).toBe('pending');
    });

    it.each([
      ['sucesso', (resolve) => resolve([savedContext])],
      ['falha', (_, reject) => reject(new Error('Network Error'))],
    ])('não deve atualizar o estado se sair antes do carregamento terminar (%s)', async (_, settle) => {
      let resolveFn;
      let rejectFn;
      listDiagrams.mockReturnValue(new Promise((resolve, reject) => { resolveFn = resolve; rejectFn = reject; }));
      const { result, unmount } = renderHook(() => useDiagramEditor(PROJECT_ID));

      unmount();
      await act(async () => settle(resolveFn, rejectFn));

      expect(result.current.loadStatus).toBe('loading');
    });
  });

  describe('salvamento imediato', () => {
    it('deve salvar na hora pelo botão Salvar', async () => {
      const { result } = await renderLoadedEditor();
      dragEnd(result, 'n1', { x: 50, y: 60 });

      await act(async () => {
        await result.current.save();
      });

      expect(saveDiagram).toHaveBeenCalledTimes(1);
      expect(result.current.saveStatus).toBe('saved');
    });

    it('não deve chamar a API ao clicar em Salvar sem alterações pendentes', async () => {
      const { result } = await renderLoadedEditor();

      await act(async () => {
        await result.current.save();
      });

      expect(saveDiagram).not.toHaveBeenCalled();
      expect(result.current.saveStatus).toBe('saved');
    });

    it('deve salvar o nível com alterações pendentes ao trocar de nível', async () => {
      const { result } = await renderLoadedEditor();
      dragEnd(result, 'n1', { x: 50, y: 60 });

      act(() => result.current.setActiveLevel('container'));

      await waitFor(() => expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'context', expect.any(Object)));
      expect(result.current.activeLevel).toBe('container');
    });

    it('deve salvar as alterações pendentes ao sair do editor', async () => {
      const { result, unmount } = await renderLoadedEditor();
      dragEnd(result, 'n1', { x: 50, y: 60 });

      unmount();

      await waitFor(() => expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'context', expect.any(Object)));
    });

    it('não deve salvar nada ao sair do editor sem alterações', async () => {
      const { unmount } = await renderLoadedEditor();

      unmount();
      await advanceAutosave();

      expect(saveDiagram).not.toHaveBeenCalled();
    });
  });
});
