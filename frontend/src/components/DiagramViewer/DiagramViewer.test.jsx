import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DiagramViewer from './DiagramViewer';
import { mockReactFlowBrowserApis } from '../../test/reactFlowMocks';

mockReactFlowBrowserApis();

const nodes = [
  { id: 'p1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
  { id: 'c1', type: 'c4-container', position: { x: 300, y: 0 }, data: { label: 'API', technology: 'Node.js' } },
];
const edges = [{ id: 'e1', source: 'p1', target: 'c1', label: 'Usa', data: { technology: 'HTTPS' } }];

function renderViewer(props = {}) {
  return render(
    <div style={{ width: 800, height: 600 }}>
      <DiagramViewer level="container" nodes={nodes} edges={edges} {...props} />
    </div>
  );
}

describe('DiagramViewer (link de visualização, só leitura)', () => {
  it('deve desenhar os elementos sem deixar arrastar, conectar ou selecionar', async () => {
    renderViewer();

    const element = (await screen.findByText('Cliente')).closest('.react-flow__node');
    expect(element).not.toHaveClass('draggable');
    expect(element).not.toHaveClass('selectable');
    expect(element).not.toHaveClass('connectable');
  });

  it('deve oferecer zoom e enquadrar, sem travar nem editar', async () => {
    renderViewer();
    await screen.findByText('Cliente');

    const controls = within(screen.getByLabelText('Controles da visualização'));
    expect(controls.getByRole('button', { name: /zoom in|aproximar/i })).toBeInTheDocument();
    expect(controls.getByRole('button', { name: /fit view|enquadrar/i })).toBeInTheDocument();
    expect(controls.queryByRole('button', { name: /travar|interactiv/i })).not.toBeInTheDocument();
  });

  it('deve mostrar a fronteira do elemento detalhado e a legenda dos tipos usados', async () => {
    renderViewer({ boundary: { label: 'Loja Online', type: 'Software System', innerTypes: ['c4-container', 'c4-container-db'] } });

    expect(await screen.findByRole('group', { name: 'Fronteira: Loja Online [Software System]' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /legenda/i })).toHaveTextContent('Container');
  });

  it('deve avisar quando o nível ainda não tem diagrama', () => {
    renderViewer({ nodes: [], edges: [] });

    expect(screen.getByText('Este nível ainda não tem diagrama.')).toBeInTheDocument();
  });
});
