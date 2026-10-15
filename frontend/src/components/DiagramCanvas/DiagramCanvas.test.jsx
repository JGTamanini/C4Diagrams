import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DiagramCanvas from './DiagramCanvas';
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
  };
  render(
    <div style={{ width: 800, height: 600 }}>
      <DiagramCanvas level="context" nodes={nodes} edges={[]} {...handlers} {...props} />
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

    expect(screen.getByText('Este nível ainda não tem elementos. Arraste um elemento da paleta para começar.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Legenda' })).not.toBeInTheDocument();
  });

  it('deve exibir a paleta do nível e a legenda do diagrama', () => {
    renderCanvas({ level: 'container' });

    expect(screen.getByRole('button', { name: 'Banco de Dados' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Legenda' })).toBeInTheDocument();
  });

  describe('adição de elementos', () => {
    it('deve adicionar o elemento solto no canvas, na posição do diagrama', () => {
      const { onAddNode } = renderCanvas();

      dropElement('c4-system-external');

      expect(onAddNode).toHaveBeenCalledWith('c4-system-external', { x: expect.any(Number), y: expect.any(Number) });
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
});
