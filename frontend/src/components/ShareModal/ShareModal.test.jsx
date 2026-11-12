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

  it('deve gerar um link novo (o anterior para de funcionar) e revogar', async () => {
    const user = userEvent.setup();
    const NEW_TOKEN = 'zzzDEF123_-abcDEF123_-abcDEF1234';
    getShareLink.mockResolvedValue({ token: TOKEN });
    createShareLink.mockResolvedValue({ token: NEW_TOKEN });
    revokeShareLink.mockResolvedValue();
    renderModal();

    expect(await screen.findByText(/o link anterior para de funcionar/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gerar novo link' }));
    await waitFor(() => expect(screen.getByLabelText('Link de visualização')).toHaveValue(LINK.replace(TOKEN, NEW_TOKEN)));

    await user.click(screen.getByRole('button', { name: 'Revogar link' }));
    expect(revokeShareLink).toHaveBeenCalledWith(PROJECT_ID);
    expect(await screen.findByRole('button', { name: 'Criar link' })).toBeInTheDocument();
  });

  it('deve mostrar o erro quando a API falha', async () => {
    getShareLink.mockRejectedValue({ response: { data: { message: 'Projeto não encontrado.' } } });
    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('Projeto não encontrado.');
  });
});
