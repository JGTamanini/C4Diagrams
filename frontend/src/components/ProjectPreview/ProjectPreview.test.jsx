import { render, screen } from '@testing-library/react';
import ProjectPreview from './ProjectPreview';

const context = {
  nodes: [
    { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
    { id: 'n2', type: 'c4-system', position: { x: 0, y: 260 }, data: { label: 'Loja Online' } },
    { id: 'n3', type: 'c4-system-external', position: { x: 380, y: 260 }, data: { label: 'Pagamentos' } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', label: 'Compra em' },
    { id: 'e2', source: 'n2', target: 'n3', label: 'Usa' },
    { id: 'e3', source: 'n2', target: 'removido', label: 'Usa' },
  ],
};

describe('ProjectPreview', () => {
  it('deve desenhar cada elemento do diagrama de Contexto com as cores oficiais do tipo', () => {
    render(<ProjectPreview data={context} />);

    const nodes = screen.getAllByTestId('preview-node');
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toHaveAttribute('data-type', 'c4-person');
    expect(nodes[1].querySelector('rect')).toHaveAttribute('fill', '#1168BD');
  });

  it('deve desenhar só as relações entre elementos existentes', () => {
    render(<ProjectPreview data={context} />);

    expect(screen.getAllByTestId('preview-edge')).toHaveLength(2);
  });

  it('deve mostrar os nomes dos elementos só quando pedido (prévia grande)', () => {
    const { rerender } = render(<ProjectPreview data={context} />);
    expect(screen.queryByText('Cliente')).not.toBeInTheDocument();

    rerender(<ProjectPreview data={context} showLabels />);
    expect(screen.getByText('Cliente')).toBeInTheDocument();
  });

  it('deve quebrar nomes longos em até duas linhas, com reticências se ainda não couber', () => {
    render(
      <ProjectPreview
        showLabels
        data={{
          nodes: [
            { id: 'a', type: 'c4-system-external', position: { x: 0, y: 0 }, data: { label: 'Gateway de Pagamento' } },
            {
              id: 'b',
              type: 'c4-system',
              position: { x: 300, y: 0 },
              data: { label: 'Plataforma de gestão integrada de pedidos e estoque' },
            },
          ],
          edges: [],
        }}
      />
    );

    const [gateway, platform] = screen.getAllByTestId('preview-node').map((node) =>
      [...node.querySelectorAll('tspan')].map((line) => line.textContent)
    );
    expect(gateway).toEqual(['Gateway de', 'Pagamento']);
    expect(platform).toHaveLength(2);
    expect(platform[1].endsWith('…')).toBe(true);
  });

  it('deve indicar quando o diagrama de Contexto ainda está vazio', () => {
    render(<ProjectPreview data={null} />);

    expect(screen.getByText('Diagrama de Contexto vazio')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-node')).not.toBeInTheDocument();
  });
});
