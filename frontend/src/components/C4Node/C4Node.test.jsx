import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ReactFlowProvider, useConnection } from '@xyflow/react';
import C4Node from './C4Node';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return { ...actual, useConnection: vi.fn() };
});

// Simula o estado de conexão do React Flow (o arrasto real não roda no jsdom)
function connecting(fromNodeId) {
  useConnection.mockImplementation((select) => select({ inProgress: fromNodeId !== null, fromNode: fromNodeId && { id: fromNodeId } }));
}

function renderNode(type, data, selected = false) {
  return render(
    <ReactFlowProvider>
      <C4Node id="n1" type={type} data={data} selected={selected} />
    </ReactFlowProvider>
  );
}

describe('C4Node', () => {
  beforeEach(() => connecting(null));

  it('deve exibir título, tipo com tecnologia e descrição, como pede a notação oficial', () => {
    renderNode('c4-container', { label: 'API', technology: 'Node.js', description: 'Regras de negócio' });

    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('[Container: Node.js]')).toBeInTheDocument();
    expect(screen.getByText('Regras de negócio')).toBeInTheDocument();
  });

  it('deve aplicar as cores oficiais do tipo', () => {
    renderNode('c4-component', { label: 'Router' });

    expect(screen.getByTestId('c4-node-body')).toHaveStyle({ backgroundColor: '#85BBF0', color: '#000000' });
  });

  it.each([
    ['c4-person', 'person'],
    ['c4-container-db', 'database'],
    ['c4-system', 'box'],
  ])('deve desenhar %s com a forma %s', (type, shape) => {
    renderNode(type, { label: 'Elemento' });

    expect(screen.getByTestId('c4-node')).toHaveAttribute('data-shape', shape);
  });

  it('deve oferecer pontos de conexão nos quatro lados', () => {
    connecting(null);
    const { container } = renderNode('c4-system', { label: 'Loja' });

    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(4);
    expect(screen.queryByTestId('c4-node-drop-target')).not.toBeInTheDocument();
  });

  it('deve virar alvo de corpo inteiro enquanto outro elemento está sendo conectado (basta passar o mouse)', () => {
    connecting('outro');
    renderNode('c4-system', { label: 'Loja' });

    expect(screen.getByTestId('c4-node-drop-target')).toHaveClass('react-flow__handle');
  });

  it('não deve virar alvo de si mesmo', () => {
    connecting('n1');
    renderNode('c4-system', { label: 'Loja' });

    expect(screen.queryByTestId('c4-node-drop-target')).not.toBeInTheDocument();
  });

  it('deve destacar o elemento selecionado', () => {
    const { rerender } = renderNode('c4-system', { label: 'Loja' });
    expect(screen.getByTestId('c4-node')).toHaveAttribute('data-selected', 'false');

    rerender(
      <ReactFlowProvider>
        <C4Node id="n1" type="c4-system" data={{ label: 'Loja' }} selected />
      </ReactFlowProvider>
    );
    expect(screen.getByTestId('c4-node')).toHaveAttribute('data-selected', 'true');
  });

  describe('marcador da validação (RF17)', () => {
    it.each([
      ['error', 'Este elemento tem erro de validação'],
      ['warning', 'Este elemento tem aviso de validação'],
    ])('deve marcar o elemento com %s', (issueSeverity, label) => {
      renderNode('c4-person', { label: 'Cliente', issueSeverity });

      const marker = screen.getByTestId('issue-marker');
      expect(marker).toHaveAttribute('data-severity', issueSeverity);
      expect(marker).toHaveAttribute('title', label);
    });

    it('não deve marcar elemento sem problema', () => {
      renderNode('c4-person', { label: 'Cliente' });

      expect(screen.queryByTestId('issue-marker')).not.toBeInTheDocument();
    });
  });
});
