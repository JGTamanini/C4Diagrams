import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DropdownMenu from './DropdownMenu';

function renderMenu(items) {
  render(<DropdownMenu label="Configurações" trigger="⚙" items={items} />);
  return screen.getByRole('button', { name: 'Configurações' });
}

describe('DropdownMenu', () => {
  it('deve abrir e fechar pelo botão, com aria-expanded', async () => {
    const user = userEvent.setup();
    const trigger = renderMenu([{ label: 'Salvar', onSelect: vi.fn() }]);
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Configurações' })).toBeInTheDocument();

    await user.click(trigger);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('deve executar o item escolhido e fechar o menu', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    await user.click(renderMenu([{ label: 'Salvar', onSelect }]));

    await user.click(screen.getByRole('menuitem', { name: 'Salvar' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('deve mostrar a dica do item (ex.: atalho) e desabilitar item indisponível', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    await user.click(
      renderMenu([
        { label: 'Salvar', hint: 'Ctrl+S', onSelect: vi.fn() },
        { label: 'Exportar', hint: 'Em breve', disabled: true, onSelect },
      ])
    );
    const menu = screen.getByRole('menu');

    expect(within(menu).getByRole('menuitem', { name: /Salvar/ })).toHaveTextContent('Ctrl+S');
    const exportItem = within(menu).getByRole('menuitem', { name: /Exportar/ });
    expect(exportItem).toBeDisabled();
    expect(exportItem).toHaveTextContent('Em breve');
  });

  it('deve fechar com Esc devolvendo o foco ao botão, e ao clicar fora', async () => {
    const user = userEvent.setup();
    const trigger = renderMenu([{ label: 'Salvar', onSelect: vi.fn() }]);

    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
