import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ShareModal from './ShareModal';
import { createShareLink, getShareLink, revokeShareLink } from '../../services/share';

vi.mock('../../services/share', async () => {
  const actual = await vi.importActual('../../services/share');
  return { ...actual, getShareLink: vi.fn(), createShareLink: vi.fn(), revokeShareLink: vi.fn() };
});

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const TOKEN = 'abcDEF123_-abcDEF123_-abcDEF1234';
const LINK = `${window.location.origin}/compartilhado/${TOKEN}`;

function renderModal() {
  const onClose = vi.fn();
  render(<ShareModal projectId={PROJECT_ID} onClose={onClose} />);
  return { onClose };
}

describe('ShareModal (link de visualização)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem link, deve explicar o que ele faz e oferecer criar', async () => {
    const user = userEvent.setup();
    getShareLink.mockResolvedValue({ token: null });
    createShareLink.mockResolvedValue({ token: TOKEN });
    renderModal();

    expect(await screen.findByText(/qualquer pessoa logada com o link/i)).toBeInTheDocument();
    expect(screen.getByText(/data da última alteração/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar link' }));

    expect(createShareLink).toHaveBeenCalledWith(PROJECT_ID);
    expect(await screen.findByLabelText('Link de visualização')).toHaveValue(LINK);
  });

  it('com link, deve copiar, avisando que copiou', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    getShareLink.mockResolvedValue({ token: TOKEN });
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Copiar' }));

    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();
  });

  // Review da #80: trocar e revogar derrubam o link de quem já o recebeu, então pedem confirmação (como excluir a conta)
  it('Gerar novo link deve pedir confirmação: Cancelar mantém o link atual', async () => {
    const user = userEvent.setup();
    getShareLink.mockResolvedValue({ token: TOKEN });
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Gerar novo link' }));

    const confirm = screen.getByRole('group', { name: 'Confirmar a troca do link' });
    expect(confirm).toHaveTextContent('Quem já recebeu o link atual não vai conseguir mais abrir o diagrama.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(createShareLink).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Link de visualização')).toHaveValue(LINK);
    expect(screen.getByRole('button', { name: 'Gerar novo link' })).toBeInTheDocument();
  });

  it('Gerar novo link, confirmado, troca o link (o anterior para de funcionar)', async () => {
    const user = userEvent.setup();
    const NEW_TOKEN = 'zzzDEF123_-abcDEF123_-abcDEF1234';
    getShareLink.mockResolvedValue({ token: TOKEN });
    createShareLink.mockResolvedValue({ token: NEW_TOKEN });
    renderModal();

    expect(await screen.findByText(/o link anterior para de funcionar/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gerar novo link' }));
    await user.click(screen.getByRole('button', { name: 'Sim, gerar novo link' }));

    expect(createShareLink).toHaveBeenCalledWith(PROJECT_ID);
    await waitFor(() => expect(screen.getByLabelText('Link de visualização')).toHaveValue(LINK.replace(TOKEN, NEW_TOKEN)));
    expect(screen.queryByRole('group', { name: /confirmar/i })).not.toBeInTheDocument();
  });

  it('Revogar link deve pedir confirmação e, confirmado, revogar', async () => {
    const user = userEvent.setup();
    getShareLink.mockResolvedValue({ token: TOKEN });
    revokeShareLink.mockResolvedValue();
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Revogar link' }));

    expect(screen.getByRole('group', { name: 'Confirmar a revogação do link' })).toHaveTextContent(
      'Quem já recebeu o link não vai conseguir mais abrir o diagrama.'
    );
    expect(revokeShareLink).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sim, revogar' }));

    expect(revokeShareLink).toHaveBeenCalledWith(PROJECT_ID);
    expect(await screen.findByRole('button', { name: 'Criar link' })).toBeInTheDocument();
  });

  it('Criar link, sem link ainda, não pede confirmação: não derruba nada', async () => {
    const user = userEvent.setup();
    getShareLink.mockResolvedValue({ token: null });
    createShareLink.mockResolvedValue({ token: TOKEN });
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Criar link' }));

    expect(createShareLink).toHaveBeenCalledWith(PROJECT_ID);
    expect(screen.queryByRole('group', { name: /confirmar/i })).not.toBeInTheDocument();
  });

  it('deve mostrar o erro quando a API falha', async () => {
    getShareLink.mockRejectedValue({ response: { data: { message: 'Projeto não encontrado.' } } });
    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('Projeto não encontrado.');
  });
});
