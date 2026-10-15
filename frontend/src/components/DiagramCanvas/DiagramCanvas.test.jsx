import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DiagramCanvas from './DiagramCanvas';
import { mockReactFlowBrowserApis } from '../../test/reactFlowMocks';

mockReactFlowBrowserApis();

const nodes = [
  { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
  { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja Online' } },
];

describe('DiagramCanvas', () => {
  it('deve desenhar os elementos com a notação C4 (tipo explícito)', async () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <DiagramCanvas nodes={nodes} edges={[]} onNodesChange={vi.fn()} onEdgesChange={vi.fn()} />
      </div>
    );

    expect(await screen.findByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('[Person]')).toBeInTheDocument();
    expect(screen.getByText('[Software System]')).toBeInTheDocument();
  });

  it('deve indicar quando o nível ainda não tem elementos', () => {
    render(<DiagramCanvas nodes={[]} edges={[]} onNodesChange={vi.fn()} onEdgesChange={vi.fn()} />);

    expect(screen.getByText('Este nível ainda não tem elementos.')).toBeInTheDocument();
  });
});
