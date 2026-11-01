import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import Modal from './Modal';

function renderModal(props = {}) {
  const onClose = vi.fn();
  render(
    <Modal title="Editar elemento" onClose={onClose} {...props}>
      <input aria-label="Nome" />
    </Modal>
  );
  const dialog = screen.getByRole('dialog', { name: 'Editar elemento' });
  return { onClose, dialog, backdrop: dialog.parentElement };
}

// Clique completo: pressionar num lugar e soltar em outro (o navegador dispara o click no ancestral comum)
function press(downTarget, clickTarget = downTarget) {
  fireEvent.mouseDown(downTarget);
  fireEvent.mouseUp(clickTarget);
  fireEvent.click(clickTarget);
}

describe('Modal', () => {
  it('deve fechar com Esc', () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('deve fechar ao clicar fora, no fundo escurecido', () => {
    const { onClose, backdrop } = renderModal();

    press(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não deve fechar ao clicar dentro do modal', () => {
    const { onClose, dialog } = renderModal();

    press(dialog);
    press(screen.getByLabelText('Nome'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('não deve fechar quando o clique começa dentro e termina fora (ex.: selecionando o texto de um campo)', () => {
    const { onClose, backdrop } = renderModal();

    press(screen.getByLabelText('Nome'), backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('não deve fechar enquanto algo está sendo salvo, nem pelo Esc nem clicando fora', () => {
    const { onClose, backdrop } = renderModal({ busy: true });

    fireEvent.keyDown(document, { key: 'Escape' });
    press(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });
});
