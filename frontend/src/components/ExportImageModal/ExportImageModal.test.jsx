import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ExportImageModal from './ExportImageModal';

function renderModal(onExport = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(<ExportImageModal levelLabel="Container" onExport={onExport} onClose={onClose} />);
  return { onExport, onClose };
}

describe('ExportImageModal (RF18)', () => {
  it('deve começar com PNG, diagrama inteiro e fundo claro (o mais comum em documentos)', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Exportar imagem do nível Container' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'PNG' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Diagrama inteiro (ajustado ao conteúdo)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro (para documentos e impressão)' })).toBeChecked();
  });

  it('deve exportar com as opções escolhidas e fechar ao terminar', async () => {
    const user = userEvent.setup();
    const { onExport, onClose } = renderModal();

    await user.click(screen.getByRole('radio', { name: 'PDF' }));
    await user.click(screen.getByRole('radio', { name: 'Área visível na tela' }));
    await user.click(screen.getByRole('radio', { name: 'Escuro (como no editor)' }));
    await user.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(onExport).toHaveBeenCalledWith({ format: 'pdf', area: 'visible', background: 'dark' });
    expect(onClose).toHaveBeenCalled();
  });

  it('deve indicar que está gerando e não fechar no meio', async () => {
    const user = userEvent.setup();
    let finish;
    const { onClose } = renderModal(vi.fn(() => new Promise((resolve) => (finish = resolve))));

    await user.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    finish();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('deve mostrar o erro e continuar aberto quando não conseguir gerar', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal(vi.fn().mockRejectedValue(new Error('Este nível ainda não tem elementos para exportar.')));

    await user.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este nível ainda não tem elementos para exportar.');
    expect(onClose).not.toHaveBeenCalled();
  });
});
