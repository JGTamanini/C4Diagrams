import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

function renderDialog(props = {}) {
  const onConfirm = props.onConfirm ?? vi.fn().mockResolvedValue(undefined);
  const onCancel = props.onCancel ?? vi.fn();
  render(
    <ConfirmDialog
      title="Excluir projeto"
      message="Esta ação é permanente."
      confirmLabel="Excluir"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('deve exibir título e mensagem como alertdialog, com foco em Cancelar', () => {
    renderDialog();

    const dialog = screen.getByRole('alertdialog', { name: 'Excluir projeto' });
    expect(dialog).toHaveTextContent('Esta ação é permanente.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('deve chamar onConfirm ao confirmar', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('deve desabilitar a confirmação enquanto a ação está em andamento', async () => {
    const user = userEvent.setup();
    renderDialog({ onConfirm: vi.fn(() => new Promise(() => {})) });

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();
  });

  it('deve reabilitar a confirmação quando a ação falhar', async () => {
    const user = userEvent.setup();
    renderDialog({ onConfirm: vi.fn().mockRejectedValue(new Error('falhou')) });

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeEnabled();
  });

  it.each([
    ['Cancelar', (user) => user.click(screen.getByRole('button', { name: 'Cancelar' }))],
    ['tecla Esc', (user) => user.keyboard('{Escape}')],
  ])('deve cancelar via %s', async (_, action) => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await action(user);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
