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

      act(() => result.current.selectLevel('container'));
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
      act(() => result.current.selectLevel('container'));

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

    it('não deve enviar dois salvamentos ao mesmo tempo: o pedido feito durante um salvamento roda depois, com os dados mais novos', async () => {
      let finishFirstSave;
      saveDiagram.mockImplementationOnce(() => new Promise((resolve) => { finishFirstSave = resolve; }));
      const { result } = await renderLoadedEditor();
      dragEnd(result, 'n1', { x: 50, y: 60 });

      let firstSave;
      act(() => {
        firstSave = result.current.save();
      });
      dragEnd(result, 'n1', { x: 70, y: 80 });
      let secondSave;
      act(() => {
        secondSave = result.current.save();
      });
      expect(saveDiagram).toHaveBeenCalledTimes(1);

      await act(async () => {
        finishFirstSave({});
        await Promise.all([firstSave, secondSave]);
      });

      expect(saveDiagram).toHaveBeenCalledTimes(2);
      expect(saveDiagram.mock.calls[1][2].nodes[0].position).toEqual({ x: 70, y: 80 });
      expect(result.current.saveStatus).toBe('saved');
    });

    it('deve tentar de novo só os níveis que falharam', async () => {
      listDiagrams.mockResolvedValue([
        savedContext,
        {
          level: 'container',
          data: { nodes: [{ id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API' } }], edges: [] },
        },
      ]);
      saveDiagram.mockRejectedValueOnce(new Error('Network Error')).mockRejectedValueOnce(new Error('Network Error'));
      const { result } = await renderLoadedEditor();

      // Contexto fica pendente após duas falhas (salvar e trocar de nível); depois o Container também é alterado
      dragEnd(result, 'n1', { x: 50, y: 60 });
      await act(async () => {
        await result.current.save();
      });
      act(() => result.current.selectLevel('container'));
      await waitFor(() => expect(saveDiagram).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.saveStatus).toBe('error'));
      dragEnd(result, 'c1', { x: 10, y: 10 });

      saveDiagram.mockReset();
      saveDiagram.mockImplementation((_, level) =>
        level === 'container' ? Promise.reject(new Error('Network Error')) : Promise.resolve({})
      );
      await act(async () => {
        await result.current.save();
      });
      expect(saveDiagram.mock.calls.map((call) => call[1]).sort()).toEqual(['container', 'context']);
      expect(result.current.saveStatus).toBe('error');

      saveDiagram.mockReset();
      saveDiagram.mockResolvedValue({});
      await act(async () => {
        await result.current.save();
      });
      expect(saveDiagram.mock.calls.map((call) => call[1])).toEqual(['container']);
      expect(result.current.saveStatus).toBe('saved');
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

  describe('edição do diagrama', () => {
    it('deve adicionar um elemento do nível com o nome do tipo como título e salvar', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.addNode('c4-system-external', { x: 120, y: 80 }));

      const added = result.current.nodes[2];
      expect(added).toMatchObject({ type: 'c4-system-external', position: { x: 120, y: 80 }, data: { label: 'Sistema Externo' } });
      expect(added.id).toEqual(expect.any(String));
      expect(added.id).not.toBe(result.current.nodes[1].id);
      expect(result.current.saveStatus).toBe('pending');
      await advanceAutosave();
      expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'context', expect.objectContaining({ nodes: expect.any(Array) }));
    });

    it('deve ignorar elemento incompatível com o nível ativo (RN08)', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.addNode('c4-component', { x: 0, y: 0 }));

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.saveStatus).toBe('saved');
    });

    it('deve criar a conexão com o rótulo padrão "Usa"', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.removeEdge('e1'));
      act(() => result.current.connect({ source: 'n2', target: 'n1', sourceHandle: null, targetHandle: null }));

      expect(result.current.edges).toHaveLength(1);
      expect(result.current.edges[0]).toMatchObject({ source: 'n2', target: 'n1', label: 'Usa', data: {} });
      expect(result.current.edges[0].id).not.toBe('e1');
      expect(result.current.saveStatus).toBe('pending');
    });

    it('não deve criar a relação de volta entre o mesmo par (sem "via dupla")', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.connect({ source: 'n2', target: 'n1' }));

      expect(result.current.edges).toHaveLength(1);
      expect(result.current.saveStatus).toBe('saved');
    });

    it('não deve criar uma segunda relação no mesmo sentido entre o mesmo par', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.connect({ source: 'n1', target: 'n2' }));

      expect(result.current.edges).toHaveLength(1);
      expect(result.current.saveStatus).toBe('saved');
    });

    it('não deve ligar um elemento a ele mesmo', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.connect({ source: 'n1', target: 'n1' }));

      expect(result.current.edges).toHaveLength(1);
      expect(result.current.saveStatus).toBe('saved');
    });

    it('deve atualizar título, descrição e tecnologia de um elemento, removendo campos esvaziados', async () => {
      listDiagrams.mockResolvedValue([
        {
          level: 'container',
          data: {
            nodes: [{ id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API', description: 'Antiga' } }],
            edges: [],
          },
        },
      ]);
      const { result } = await renderLoadedEditor();
      act(() => result.current.selectLevel('container'));

      act(() => result.current.updateNode('c1', { label: 'API de Pedidos', description: '', technology: 'Node.js' }));

      expect(result.current.nodes[0].data).toEqual({ label: 'API de Pedidos', technology: 'Node.js' });
      await advanceAutosave();
      expect(saveDiagram).toHaveBeenCalledWith(PROJECT_ID, 'container', {
        nodes: [{ id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API de Pedidos', technology: 'Node.js' } }],
        edges: [],
      });
    });

    it('deve atualizar rótulo e tecnologia de uma conexão', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.updateEdge('e1', { label: 'Navega em', technology: '' }));

      expect(result.current.edges[0]).toMatchObject({ id: 'e1', label: 'Navega em', data: {} });
      await advanceAutosave();
      expect(saveDiagram).toHaveBeenCalledWith(
        PROJECT_ID,
        'context',
        expect.objectContaining({ edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Navega em' }] })
      );
    });

    it('deve gravar a tecnologia informada na conexão', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.updateEdge('e1', { label: 'Compra em', technology: 'HTTPS' }));

      expect(result.current.edges[0]).toMatchObject({ label: 'Compra em', data: { technology: 'HTTPS' } });
    });

    it('deve excluir um elemento junto com as conexões dele', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.removeNode('n1'));

      expect(result.current.nodes.map((n) => n.id)).toEqual(['n2']);
      expect(result.current.edges).toEqual([]);
      expect(result.current.saveStatus).toBe('pending');
    });

    it('deve excluir uma conexão', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.removeEdge('e1'));

      expect(result.current.edges).toEqual([]);
      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.saveStatus).toBe('pending');
    });
  });

  describe('desfazer e refazer (RF23)', () => {
    it('deve desfazer e refazer a adição de um elemento, marcando para salvar', async () => {
      const { result } = await renderLoadedEditor();
      expect(result.current.canUndo).toBe(false);

      act(() => result.current.addNode('c4-system-external', { x: 0, y: 0 }));
      expect(result.current.canUndo).toBe(true);

      act(() => result.current.undo());
      expect(result.current.nodes.map((n) => n.id)).toEqual(['n1', 'n2']);
      expect(result.current.canRedo).toBe(true);
      expect(result.current.saveStatus).toBe('pending');

      act(() => result.current.redo());
      expect(result.current.nodes).toHaveLength(3);
      expect(result.current.canRedo).toBe(false);
    });

    it('deve desfazer um movimento inteiro de uma vez, voltando à posição de antes de arrastar', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.onNodesChange([{ type: 'position', id: 'n1', position: { x: 10, y: 10 }, dragging: true }]));
      act(() => result.current.onNodesChange([{ type: 'position', id: 'n1', position: { x: 40, y: 40 }, dragging: true }]));
      dragEnd(result, 'n1', { x: 80, y: 80 });

      act(() => result.current.undo());

      expect(result.current.nodes[0].position).toEqual({ x: 0, y: 0 });
      expect(result.current.canUndo).toBe(false);
    });

    it('deve tratar a exclusão pelo teclado (elemento e conexões avisados em sequência) como um passo só', async () => {
      const { result } = await renderLoadedEditor();

      act(() => {
        result.current.onNodesChange([{ type: 'remove', id: 'n2' }]);
        result.current.onEdgesChange([{ type: 'remove', id: 'e1' }]);
      });
      act(() => result.current.undo());

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.edges).toHaveLength(1);
      expect(result.current.canUndo).toBe(false);
    });

    it('não deve registrar seleção no histórico', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.onNodesChange([{ type: 'select', id: 'n1', selected: true }]));

      expect(result.current.canUndo).toBe(false);
    });

    it('deve descartar o que podia ser refeito quando houver uma edição nova', async () => {
      const { result } = await renderLoadedEditor();
      act(() => result.current.removeEdge('e1'));
      act(() => result.current.undo());

      act(() => result.current.updateNode('n1', { label: 'Cliente VIP' }));

      expect(result.current.canRedo).toBe(false);
    });

    it('deve manter um histórico separado para cada nível', async () => {
      const { result } = await renderLoadedEditor();
      act(() => result.current.removeNode('n2'));

      act(() => result.current.selectLevel('container'));
      expect(result.current.canUndo).toBe(false);
      act(() => result.current.undo());

      act(() => result.current.selectLevel('context'));
      expect(result.current.nodes.map((n) => n.id)).toEqual(['n1']);
      expect(result.current.canUndo).toBe(true);
    });

    it('não deve fazer nada ao desfazer ou refazer sem histórico', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.undo());
      act(() => result.current.redo());

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.saveStatus).toBe('saved');
    });

    it('deve guardar no máximo os 50 passos mais recentes', async () => {
      const { result } = await renderLoadedEditor();
      for (let i = 0; i < 55; i += 1) {
        act(() => result.current.updateNode('n1', { label: `Cliente ${i}` }));
      }

      for (let i = 0; i < 60; i += 1) {
        act(() => result.current.undo());
      }

      expect(result.current.nodes[0].data.label).toBe('Cliente 4');
    });
  });

  describe('excluir selecionados', () => {
    it('deve excluir os elementos e conexões selecionados, com as conexões dos elementos, num passo só', async () => {
      const { result } = await renderLoadedEditor();
      act(() => result.current.onNodesChange([{ type: 'select', id: 'n2', selected: true }]));
      expect(result.current.hasSelection).toBe(true);

      act(() => result.current.removeSelected());

      expect(result.current.nodes.map((n) => n.id)).toEqual(['n1']);
      expect(result.current.edges).toEqual([]);
      act(() => result.current.undo());
      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.edges).toHaveLength(1);
    });

    it('não deve fazer nada sem seleção', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.removeSelected());

      expect(result.current.hasSelection).toBe(false);
      expect(result.current.saveStatus).toBe('saved');
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

      act(() => result.current.selectLevel('container'));

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

  describe('copiar e colar', () => {
    function selectBoth(result) {
      act(() =>
        result.current.onNodesChange([
          { type: 'select', id: 'n1', selected: true },
          { type: 'select', id: 'n2', selected: true },
        ])
      );
    }

    it('não deve copiar nada sem seleção', async () => {
      const { result } = await renderLoadedEditor();

      let copied;
      act(() => {
        copied = result.current.copy();
      });

      expect(copied).toBe(false);
      expect(result.current.hasClipboard).toBe(false);
    });

    it('deve colar cópias deslocadas, com ids novos, levando a relação entre os copiados e selecionando só as cópias', async () => {
      const { result } = await renderLoadedEditor();
      selectBoth(result);

      act(() => {
        result.current.copy();
      });
      act(() => result.current.paste());

      expect(result.current.hasClipboard).toBe(true);
      expect(result.current.nodes).toHaveLength(4);
      const [, , copy1, copy2] = result.current.nodes;
      expect(copy1).toMatchObject({ type: 'c4-person', position: { x: 40, y: 40 }, data: { label: 'Cliente' }, selected: true });
      expect(copy2).toMatchObject({ type: 'c4-system', position: { x: 340, y: 40 }, selected: true });
      expect([copy1.id, copy2.id]).not.toContain('n1');
      expect(result.current.nodes.slice(0, 2).every((node) => !node.selected)).toBe(true);
      expect(result.current.edges).toHaveLength(2);
      expect(result.current.edges[1]).toMatchObject({ source: copy1.id, target: copy2.id, label: 'Compra em' });
      expect(result.current.saveStatus).toBe('pending');
    });

    it('deve deslocar mais a cada nova colagem, para as cópias não ficarem empilhadas', async () => {
      const { result } = await renderLoadedEditor();
      act(() => {
        result.current.copy(['n1']);
      });

      act(() => result.current.paste());
      act(() => result.current.paste());

      expect(result.current.nodes.slice(2).map((node) => node.position)).toEqual([
        { x: 40, y: 40 },
        { x: 80, y: 80 },
      ]);
    });

    it('deve copiar só os elementos indicados (menu de clique direito) e sem relação com quem ficou de fora', async () => {
      const { result } = await renderLoadedEditor();

      act(() => {
        result.current.copy(['n2']);
      });
      act(() => result.current.paste());

      expect(result.current.nodes).toHaveLength(3);
      expect(result.current.edges).toHaveLength(1);
    });

    it('deve colar no ponto indicado (clique direito no canvas)', async () => {
      const { result } = await renderLoadedEditor();
      selectBoth(result);
      act(() => {
        result.current.copy();
      });

      act(() => result.current.paste({ x: 500, y: 200 }));

      expect(result.current.nodes.slice(2).map((node) => node.position)).toEqual([
        { x: 500, y: 200 },
        { x: 800, y: 200 },
      ]);
    });

    it('deve colar em outro nível só os tipos permitidos nele (RN08)', async () => {
      const { result } = await renderLoadedEditor();
      selectBoth(result);
      act(() => {
        result.current.copy();
      });

      act(() => result.current.selectLevel('container'));
      act(() => result.current.paste());

      expect(result.current.nodes.map((node) => node.type)).toEqual(['c4-person']);
      expect(result.current.edges).toHaveLength(0);
    });

    it('deve desfazer a colagem inteira em um passo', async () => {
      const { result } = await renderLoadedEditor();
      selectBoth(result);
      act(() => {
        result.current.copy();
      });
      act(() => result.current.paste());

      act(() => result.current.undo());

      expect(result.current.nodes.map((node) => node.id)).toEqual(['n1', 'n2']);
      expect(result.current.edges).toHaveLength(1);
    });
  });

  describe('limite de elementos e relações do diagrama (o mesmo do backend)', () => {
    function person(index) {
      return { id: `p${index}`, type: 'c4-person', position: { x: index, y: 0 }, data: { label: `Pessoa ${index}` } };
    }

    async function renderWith(nodes, edges = []) {
      listDiagrams.mockResolvedValue([{ level: 'context', data: { nodes, edges } }]);
      return renderLoadedEditor();
    }

    it('deve bloquear a colagem que passaria de 200 elementos, avisando o motivo', async () => {
      const nodes = Array.from({ length: 199 }, (_, index) => person(index));
      const { result } = await renderWith(nodes);
      act(() => {
        result.current.copy(['p0', 'p1']);
      });

      act(() => result.current.paste());

      expect(result.current.nodes).toHaveLength(199);
      expect(result.current.notice).toBe('O diagrama pode ter no máximo 200 elementos: a colagem não foi feita.');
      expect(result.current.saveStatus).toBe('saved');
    });

    it('deve bloquear a colagem que passaria de 400 relações', async () => {
      const nodes = [person(1), person(2)];
      const edges = Array.from({ length: 399 }, (_, index) => ({ id: `e${index}`, source: 'p1', target: 'p2', label: 'Usa' }));
      const { result } = await renderWith(nodes, edges);
      act(() => {
        result.current.copy(['p1', 'p2']);
      });

      act(() => result.current.paste());

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.notice).toBe('O diagrama pode ter no máximo 400 relações: a colagem não foi feita.');
    });

    it('deve bloquear um novo elemento da paleta no limite, e o aviso pode ser fechado', async () => {
      const nodes = Array.from({ length: 200 }, (_, index) => person(index));
      const { result } = await renderWith(nodes);

      act(() => result.current.addNode('c4-system', { x: 0, y: 0 }));

      expect(result.current.nodes).toHaveLength(200);
      expect(result.current.notice).toBe('O diagrama pode ter no máximo 200 elementos.');
      act(() => result.current.dismissNotice());
      expect(result.current.notice).toBeNull();
    });
  });

  describe('selecionar o alvo de um problema da validação', () => {
    it('deve selecionar só o elemento indicado, sem entrar no histórico nem marcar para salvar', async () => {
      const { result } = await renderLoadedEditor();
      act(() => result.current.onEdgesChange([{ type: 'select', id: 'e1', selected: true }]));

      act(() => result.current.selectOnly({ nodeId: 'n2' }));

      expect(result.current.nodes.map((node) => Boolean(node.selected))).toEqual([false, true]);
      expect(result.current.edges[0].selected).toBe(false);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.saveStatus).toBe('saved');
    });

    it('deve selecionar só a relação indicada', async () => {
      const { result } = await renderLoadedEditor();

      act(() => result.current.selectOnly({ edgeId: 'e1' }));

      expect(result.current.edges[0].selected).toBe(true);
      expect(result.current.nodes.every((node) => !node.selected)).toBe(true);
    });
  });
});
