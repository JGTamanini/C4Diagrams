import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DiagramCanvas from './DiagramCanvas';
import { RELATIONSHIP_COLOR } from '../../constants/c4Notation';
import { ELEMENT_DRAG_TYPE } from '../ElementPalette/ElementPalette';
import { mockReactFlowBrowserApis } from '../../test/reactFlowMocks';

mockReactFlowBrowserApis();

const nodes = [
  { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
  { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja Online' } },
];

const edges = [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em', data: { technology: 'HTTPS' } }];

function renderCanvas(props = {}) {
  const handlers = {
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onAddNode: vi.fn(),
    onEditNode: vi.fn(),
    onEditEdge: vi.fn(),
    onTogglePalette: vi.fn(),
    onCopyNodes: vi.fn(),
    onPaste: vi.fn(),
    onRemoveNode: vi.fn(),
    onRemoveSelected: vi.fn(),
  };
  render(
    <div style={{ width: 800, height: 600 }}>
      <DiagramCanvas level="context" nodes={nodes} edges={[]} paletteOpen {...handlers} {...props} />
    </div>
  );
  return handlers;
}

function dropElement(type) {
  fireEvent.drop(screen.getByTestId('diagram-drop-area'), {
    clientX: 200,
    clientY: 150,
    dataTransfer: { getData: (format) => (format === ELEMENT_DRAG_TYPE ? type : '') },
  });
}

describe('DiagramCanvas', () => {
  it('deve desenhar os elementos com a notação C4 (tipo explícito)', async () => {
    renderCanvas();

    expect(await screen.findByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('[Person]')).toBeInTheDocument();
    expect(screen.getByText('[Software System]')).toBeInTheDocument();
  });

  it('deve indicar quando o nível ainda não tem elementos, sem legenda', () => {
    renderCanvas({ nodes: [] });

    expect(screen.getByText('Este nível ainda não tem elementos')).toBeInTheDocument();
    expect(screen.getByText('Arraste um elemento da paleta (ou clique nele) para começar.')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-hints')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Legenda' })).not.toBeInTheDocument();
  });

  it('deve ensinar a editar, conectar e excluir quando houver elementos', () => {
    renderCanvas();

    expect(screen.getByTestId('canvas-hints')).toHaveTextContent('Duplo clique para editar');
    expect(screen.getByTestId('canvas-hints')).toHaveTextContent('Delete exclui');
  });

  it('deve exibir a paleta do nível e a legenda do diagrama', () => {
    renderCanvas({ level: 'container' });

    expect(screen.getByRole('button', { name: 'Banco de Dados' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Legenda' })).toBeInTheDocument();
  });

  describe('problemas da validação (RF17)', () => {
    const edgesWithLabel = [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em', data: {} }];
    const issues = [
      { code: 'ISOLATED_ELEMENT', severity: 'warning', nodeId: 'n1', message: 'Isolado' },
      { code: 'MISSING_DESCRIPTION', severity: 'info', nodeId: 'n2', message: 'Sem descrição' },
      { code: 'DUPLICATE_RELATIONSHIP', severity: 'error', edgeId: 'e1', message: 'Repetida' },
    ];

    it('deve marcar os elementos com erro ou aviso, mas não os que só têm sugestão', async () => {
      renderCanvas({ edges: edgesWithLabel, issues });
      await screen.findByText('Cliente');

      const markers = screen.getAllByTestId('issue-marker');
      expect(markers).toHaveLength(1);
      expect(markers[0]).toHaveAttribute('data-severity', 'warning');
    });

    it('deve contornar o rótulo da relação com problema na cor da gravidade', async () => {
      renderCanvas({ edges: edgesWithLabel, issues });
      await screen.findByText('Compra em');

      expect(document.querySelector('.react-flow__edge-textbg')).toHaveStyle({ stroke: 'var(--color-danger)' });
    });

    it('deve marcar como erro o elemento que tem erro e aviso ao mesmo tempo, em qualquer ordem', async () => {
      renderCanvas({
        issues: [
          { code: 'A', severity: 'warning', nodeId: 'n1', message: 'aviso' },
          { code: 'B', severity: 'error', nodeId: 'n1', message: 'erro' },
          { code: 'C', severity: 'warning', nodeId: 'n1', message: 'outro aviso' },
        ],
      });
      await screen.findByText('Cliente');

      expect(screen.getByTestId('issue-marker')).toHaveAttribute('data-severity', 'error');
    });

    it.each([
      ['um elemento', { nodeId: 'n1' }],
      ['uma relação (os dois lados)', { edgeId: 'e1' }],
      ['uma relação que já não existe', { edgeId: 'removida' }],
    ])('deve aceitar o pedido de foco em %s sem perder o diagrama', async (_, focusRequest) => {
      renderCanvas({ edges: edgesWithLabel, focusRequest });

      expect(await screen.findByText('Cliente')).toBeInTheDocument();
      expect(screen.getByText('Loja Online')).toBeInTheDocument();
    });

    it('deve afastar a legenda quando o painel da direita estiver aberto', async () => {
      renderCanvas({ rightInset: 300 });
      await screen.findByText('Cliente');

      expect(screen.getByRole('region', { name: 'Legenda' })).toHaveStyle({ right: '316px' });
    });
  });

  describe('menu de clique direito', () => {
    async function openNodeMenu(label) {
      fireEvent.contextMenu((await screen.findByText(label)).closest('.react-flow__node'), { clientX: 120, clientY: 80 });
      return screen.getByRole('menu', { name: 'Ações do elemento' });
    }

    it('deve oferecer Copiar, Colar, Editar e Excluir no elemento, com Colar desabilitado sem nada copiado', async () => {
      renderCanvas();

      const menu = await openNodeMenu('Cliente');

      const items = within(menu).getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual(['CopiarCtrl+C', 'ColarCtrl+V', 'Editar', 'ExcluirDelete']);
      expect(items[1]).toBeDisabled();
    });

    it('deve agir só sobre o elemento clicado quando ele não faz parte da seleção', async () => {
      const user = userEvent.setup();
      const handlers = renderCanvas();

      await user.click(within(await openNodeMenu('Cliente')).getByRole('menuitem', { name: /Copiar/ }));
      expect(handlers.onCopyNodes).toHaveBeenCalledWith(['n1']);

      await user.click(within(await openNodeMenu('Cliente')).getByRole('menuitem', { name: 'Editar' }));
      expect(handlers.onEditNode).toHaveBeenCalledWith('n1');

      await user.click(within(await openNodeMenu('Cliente')).getByRole('menuitem', { name: /Excluir/ }));
      expect(handlers.onRemoveNode).toHaveBeenCalledWith('n1');
      expect(handlers.onRemoveSelected).not.toHaveBeenCalled();
    });

    it('deve agir sobre toda a seleção quando o elemento clicado está selecionado', async () => {
      const user = userEvent.setup();
      const selected = nodes.map((node) => ({ ...node, selected: true }));
      const handlers = renderCanvas({ nodes: selected });

      await user.click(within(await openNodeMenu('Cliente')).getByRole('menuitem', { name: /Copiar/ }));
      expect(handlers.onCopyNodes).toHaveBeenCalledWith(['n1', 'n2']);

      await user.click(within(await openNodeMenu('Cliente')).getByRole('menuitem', { name: /Excluir/ }));
      expect(handlers.onRemoveSelected).toHaveBeenCalledTimes(1);
    });

    it('deve colar no ponto clicado do canvas, e fechar o menu com Esc', async () => {
      const user = userEvent.setup();
      const handlers = renderCanvas({ canPaste: true });
      await screen.findByText('Cliente');

      fireEvent.contextMenu(document.querySelector('.react-flow__pane'), { clientX: 300, clientY: 200 });
      const menu = screen.getByRole('menu', { name: 'Ações do canvas' });
      await user.click(within(menu).getByRole('menuitem', { name: /Colar/ }));

      expect(handlers.onPaste).toHaveBeenCalledWith(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));

      fireEvent.contextMenu(document.querySelector('.react-flow__pane'), { clientX: 300, clientY: 200 });
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });
  });

  describe('árvore dos elementos (abaixo da paleta)', () => {
    const nodesByLevel = { context: nodes, container: [], component: [] };

    it('deve mostrar a estrutura do projeto abaixo da paleta, levando ao elemento clicado', async () => {
      const user = userEvent.setup();
      const onSelectTreeElement = vi.fn();
      renderCanvas({ nodesByLevel, onSelectTreeElement });

      const tree = screen.getByRole('complementary', { name: 'Estrutura do projeto' });
      await user.click(within(tree).getByRole('button', { name: 'Loja Online' }));

      expect(onSelectTreeElement).toHaveBeenCalledWith('context', 'n2');
    });

    it('deve ajustar a altura da paleta pela divisória entre as duas', () => {
      renderCanvas({ nodesByLevel, onSelectTreeElement: vi.fn() });
      const splitter = screen.getByRole('separator', { name: 'Ajustar a divisão entre elementos e estrutura' });

      fireEvent.keyDown(splitter, { key: 'ArrowDown' });

      expect(screen.getByRole('complementary', { name: 'Elementos' }).parentElement).toHaveStyle({ height: '190px' });
      expect(splitter).toHaveAttribute('aria-valuenow', '190');
    });

    it('não deve mostrar a árvore sem os elementos dos níveis', () => {
      renderCanvas();

      expect(screen.queryByRole('complementary', { name: 'Estrutura do projeto' })).not.toBeInTheDocument();
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });
  });

  describe('paleta sobre o canvas', () => {
    it('não deve bloquear os cliques no canvas abaixo da paleta (ex.: botões de zoom): só a paleta recebe clique', () => {
      renderCanvas();

      const palette = screen.getByRole('complementary', { name: 'Elementos' });
      expect(palette.parentElement).toHaveClass('pointer-events-none');
      expect(palette).toHaveClass('pointer-events-auto');
    });

    it('deve mostrar a paleta aberta com o botão para ocultá-la', async () => {
      const user = userEvent.setup();
      const { onTogglePalette } = renderCanvas();

      expect(screen.getByRole('complementary', { name: 'Elementos' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ocultar elementos' }));

      expect(onTogglePalette).toHaveBeenCalledTimes(1);
    });

    it('deve trocar a paleta oculta por um botão discreto para mostrá-la de novo', async () => {
      const user = userEvent.setup();
      const { onTogglePalette } = renderCanvas({ paletteOpen: false });

      expect(screen.queryByRole('complementary', { name: 'Elementos' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Mostrar elementos' }));

      expect(onTogglePalette).toHaveBeenCalledTimes(1);
    });
  });

  describe('adição de elementos', () => {
    it('deve adicionar o elemento solto no canvas, na posição do diagrama', () => {
      const { onAddNode } = renderCanvas();

      dropElement('c4-system-external');

      expect(onAddNode).toHaveBeenCalledWith('c4-system-external', { x: expect.any(Number), y: expect.any(Number) });
    });

    it('não deve criar elemento escondido quando o arraste for solto de volta em cima da paleta', () => {
      const { onAddNode } = renderCanvas();
      const palette = screen.getByRole('complementary', { name: 'Elementos' });
      const dataTransfer = { getData: () => 'c4-person', dropEffect: 'move' };

      fireEvent.dragOver(palette, { dataTransfer });
      fireEvent.drop(palette, { clientX: 60, clientY: 80, dataTransfer });

      expect(dataTransfer.dropEffect).toBe('none');
      expect(onAddNode).not.toHaveBeenCalled();
    });

    it('deve ignorar o que for solto e não for um elemento do nível (RN08)', () => {
      const { onAddNode } = renderCanvas();

      dropElement('c4-component');
      dropElement('');

      expect(onAddNode).not.toHaveBeenCalled();
    });

    it('deve permitir soltar elementos sobre o canvas', () => {
      renderCanvas();
      const dataTransfer = { dropEffect: '' };

      fireEvent.dragOver(screen.getByTestId('diagram-drop-area'), { dataTransfer });

      expect(dataTransfer.dropEffect).toBe('move');
    });

    it('deve adicionar pelo clique na paleta, no centro da área visível', async () => {
      const user = userEvent.setup();
      const { onAddNode } = renderCanvas();

      await user.click(screen.getByRole('button', { name: 'Sistema de Software' }));

      expect(onAddNode).toHaveBeenCalledWith('c4-system', { x: expect.any(Number), y: expect.any(Number) });
    });
  });

  describe('teclado', () => {
    const selectedNodes = nodes.map((node) => ({ ...node, selected: node.id === 'n1' }));

    it('deve excluir o elemento selecionado com Delete', async () => {
      const { onNodesChange } = renderCanvas({ nodes: selectedNodes });
      await screen.findByText('Cliente');

      await userEvent.keyboard('{Delete}');

      expect(onNodesChange).toHaveBeenCalledWith(expect.arrayContaining([{ id: 'n1', type: 'remove' }]));
    });

    it('não deve excluir nada com Delete quando o teclado do canvas estiver desligado (modal aberto)', async () => {
      const { onNodesChange } = renderCanvas({ nodes: selectedNodes, keyboardEnabled: false });
      await screen.findByText('Cliente');

      await userEvent.keyboard('{Delete}');

      expect(onNodesChange).not.toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ type: 'remove' })]));
    });
  });

  describe('edição (RF22)', () => {
    it('deve abrir a edição do elemento com duplo clique', async () => {
      const { onEditNode } = renderCanvas();

      fireEvent.doubleClick(await screen.findByText('Cliente'));

      expect(onEditNode).toHaveBeenCalledWith('n1');
    });

    it('deve mostrar a conexão com rótulo e tecnologia e abrir a edição dela com duplo clique', async () => {
      const { onEditEdge } = renderCanvas({ edges });

      fireEvent.doubleClick(await screen.findByText('Compra em [HTTPS]'));

      expect(onEditEdge).toHaveBeenCalledWith('e1');
    });
  });

  describe('conexões flutuantes', () => {
    it('deve desenhar mais de uma relação entre o mesmo par, cada uma com o seu rótulo e em linhas separadas', async () => {
      const { container } = render(
        <div style={{ width: 800, height: 600 }}>
          <DiagramCanvas
            level="context"
            nodes={nodes}
            edges={[
              { id: 'e1', source: 'n1', target: 'n2', label: 'Compra em', data: {} },
              { id: 'e2', source: 'n1', target: 'n2', label: 'Acompanha pedidos em', data: {} },
            ]}
            onNodesChange={vi.fn()}
            onEdgesChange={vi.fn()}
            onConnect={vi.fn()}
            onAddNode={vi.fn()}
            onEditNode={vi.fn()}
            onEditEdge={vi.fn()}
          />
        </div>
      );

      expect(await screen.findByText('Compra em')).toBeInTheDocument();
      expect(screen.getByText('Acompanha pedidos em')).toBeInTheDocument();
      const paths = [...container.querySelectorAll('.react-flow__edge-path')].map((path) => path.getAttribute('d'));
      expect(paths).toHaveLength(2);
      expect(paths[0]).not.toBe(paths[1]);
    });

    it('deve destacar a linha da relação da grade do canvas (cor clara, também na seta)', async () => {
      const { container } = render(
        <div style={{ width: 800, height: 600 }}>
          <DiagramCanvas
            level="context"
            nodes={nodes}
            edges={edges}
            onNodesChange={vi.fn()}
            onEdgesChange={vi.fn()}
            onConnect={vi.fn()}
            onAddNode={vi.fn()}
            onEditNode={vi.fn()}
            onEditEdge={vi.fn()}
          />
        </div>
      );

      await screen.findByText('Compra em [HTTPS]');
      const path = container.querySelector('.react-flow__edge-path');
      expect(path).toHaveStyle({ stroke: RELATIONSHIP_COLOR });
      expect(container.querySelector('.react-flow__arrowhead polyline')).toHaveStyle({ stroke: RELATIONSHIP_COLOR });
    });
  });
});
