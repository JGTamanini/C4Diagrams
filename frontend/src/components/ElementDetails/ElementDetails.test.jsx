import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ElementDetails from './ElementDetails';

const LONG_DESCRIPTION = 'Recebe os pedidos da loja, calcula o frete e avisa o estoque. '.repeat(3).trim();
const api = { id: 'c1', type: 'c4-container', data: { label: 'API', technology: 'Node.js', description: LONG_DESCRIPTION } };
const nodes = [
  { id: 'p1', type: 'c4-person', data: { label: 'Cliente' } },
  api,
  { id: 'db', type: 'c4-container-db', data: { label: 'Banco' } },
];
const edges = [
  { id: 'e1', source: 'p1', target: 'c1', label: 'Faz pedidos', data: { technology: 'HTTPS' } },
  { id: 'e2', source: 'c1', target: 'db', label: 'Grava', data: {} },
];

function renderDetails(props = {}) {
  const handlers = { onClose: vi.fn(), onOpenLevel: vi.fn() };
  render(<ElementDetails node={api} nodes={nodes} edges={edges} {...handlers} {...props} />);
  return handlers;
}

describe('ElementDetails (detalhes do elemento na visualização)', () => {
  it('deve mostrar o nome, o tipo com a tecnologia e a descrição completa', () => {
    renderDetails();

    const panel = screen.getByRole('complementary', { name: 'Detalhes do elemento' });
    expect(panel).toHaveTextContent('API');
    expect(panel).toHaveTextContent('[Container: Node.js]');
    expect(screen.getByText(LONG_DESCRIPTION)).toBeInTheDocument();
  });

  it('deve avisar quando o elemento não tem descrição', () => {
    renderDetails({ node: nodes[0] });

    expect(screen.getByText('Sem descrição.')).toBeInTheDocument();
  });

  it('deve listar as relações de saída e de entrada, com o rótulo e a tecnologia', () => {
    renderDetails();

    expect(screen.getByRole('list', { name: 'Relações de saída' })).toHaveTextContent('Banco: Grava');
    expect(screen.getByRole('list', { name: 'Relações de entrada' })).toHaveTextContent('Cliente: Faz pedidos [HTTPS]');
  });

  it('deve avisar quando o elemento não tem relações', () => {
    renderDetails({ edges: [] });

    expect(screen.getByText('Sem relações.')).toBeInTheDocument();
  });

  it('deve mostrar de qual elemento faz parte e o nível que o detalha, levando até ele', async () => {
    const user = userEvent.setup();
    const { onOpenLevel } = renderDetails({
      partOf: 'Loja Online [Software System]',
      detailedIn: { id: 'component', label: 'Componente' },
    });

    expect(screen.getByText('Loja Online [Software System]')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver o nível Componente' }));

    expect(onOpenLevel).toHaveBeenCalledWith('component');
  });

  it('deve fechar pelo X e pelo Esc', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDetails();

    await user.click(screen.getByRole('button', { name: 'Fechar detalhes' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
