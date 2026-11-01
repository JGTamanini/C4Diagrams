import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ElementTree from './ElementTree';

const node = (id, type, label, extra = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label }, ...extra });

const nodesByLevel = {
  context: [node('p1', 'c4-person', 'Cliente'), node('s1', 'c4-system', 'Loja Online')],
  container: [node('p2', 'c4-person', '  cliente '), node('c1', 'c4-container', 'API', { selected: true })],
  component: [],
};

function renderTree(props = {}) {
  const onSelectElement = vi.fn();
  render(<ElementTree nodesByLevel={nodesByLevel} activeLevel="container" onSelectElement={onSelectElement} {...props} />);
  return { onSelectElement };
}

function folder(name) {
  return screen.getByRole('button', { name });
}

describe('ElementTree', () => {
  it('deve listar os três níveis como pastas, com a contagem de elementos', () => {
    renderTree();

    expect(screen.getByRole('complementary', { name: 'Estrutura do projeto' })).toBeInTheDocument();
    expect(folder('Contexto (2)')).toHaveAttribute('aria-expanded', 'true');
    expect(folder('Container (2)')).toBeInTheDocument();
    expect(folder('Componente (0)')).toBeInTheDocument();
  });

  it('deve destacar o nível aberto e o elemento selecionado nele', () => {
    renderTree();

    expect(folder('Container (2)')).toHaveAttribute('aria-current', 'true');
    expect(folder('Contexto (2)')).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'API' })).toHaveAttribute('aria-current', 'true');
  });

  it('deve indicar o elemento que também aparece em outro nível (mesmo tipo e nome)', () => {
    renderTree();

    const contextList = screen.getByRole('list', { name: 'Elementos de Contexto' });
    expect(within(contextList).getByRole('button', { name: 'Cliente' })).toHaveTextContent('também em: Container');
    expect(within(contextList).getByRole('button', { name: 'Loja Online' })).not.toHaveTextContent('também em');
  });

  it('deve levar ao elemento clicado, informando o nível dele', async () => {
    const user = userEvent.setup();
    const { onSelectElement } = renderTree();

    await user.click(screen.getByRole('button', { name: 'Loja Online' }));

    expect(onSelectElement).toHaveBeenCalledWith('context', 's1');
  });

  it('deve recolher e reabrir uma pasta', async () => {
    const user = userEvent.setup();
    renderTree();

    await user.click(folder('Contexto (2)'));

    expect(folder('Contexto (2)')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Elementos de Contexto' })).not.toBeInTheDocument();
    await user.click(folder('Contexto (2)'));
    expect(screen.getByRole('list', { name: 'Elementos de Contexto' })).toBeInTheDocument();
  });

  it('deve avisar quando o nível ainda não tem elementos', () => {
    renderTree();

    expect(screen.getByText('Nenhum elemento ainda')).toBeInTheDocument();
  });

  describe('recolher na vertical', () => {
    it('deve oferecer recolher a estrutura', async () => {
      const user = userEvent.setup();
      const onToggleCollapsed = vi.fn();
      renderTree({ onToggleCollapsed });

      await user.click(screen.getByRole('button', { name: 'Recolher estrutura' }));

      expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it('recolhida, deve mostrar só o título e o botão para expandir', () => {
      renderTree({ collapsed: true, onToggleCollapsed: vi.fn() });

      expect(screen.getByRole('heading', { name: 'Estrutura do projeto' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Contexto (2)' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expandir estrutura' })).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
