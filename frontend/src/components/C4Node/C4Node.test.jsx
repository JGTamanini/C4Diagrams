import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import C4Node from './C4Node';

function renderNode(type, data) {
  return render(
    <ReactFlowProvider>
      <C4Node id="n1" type={type} data={data} />
    </ReactFlowProvider>
  );
}

describe('C4Node', () => {
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

  it('deve oferecer pontos de entrada e saída de conexão', () => {
    const { container } = renderNode('c4-system', { label: 'Loja' });

    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(2);
  });
});
