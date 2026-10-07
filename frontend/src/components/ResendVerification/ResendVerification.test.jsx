import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ResendVerification from './ResendVerification';
import api from '../../services/api';

vi.mock('../../services/api');

const GENERIC_MESSAGE = 'Se esse e-mail estiver cadastrado e ainda não verificado, enviamos um novo link de verificação.';

describe('ResendVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('com e-mail conhecido (após o cadastro)', () => {
    it('deve reenviar para o e-mail informado e exibir a resposta da API', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { message: GENERIC_MESSAGE } });

      render(<ResendVerification email="joao@example.com" />);

      expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Não recebeu? Reenviar' }));

      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'joao@example.com' });
      expect(await screen.findByRole('status')).toHaveTextContent(GENERIC_MESSAGE);
    });
  });

  describe('sem e-mail conhecido (link inválido ou expirado)', () => {
    it('deve pedir o e-mail, reenviar e exibir a resposta da API', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { message: GENERIC_MESSAGE } });

      render(<ResendVerification />);

      await user.type(screen.getByLabelText('E-mail'), 'joao@example.com');
      await user.click(screen.getByRole('button', { name: 'Reenviar link' }));

      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'joao@example.com' });
      expect(await screen.findByRole('status')).toHaveTextContent(GENERIC_MESSAGE);
    });
  });

  it('deve exibir erro quando o reenvio falhar', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('Network Error'));

    render(<ResendVerification email="joao@example.com" />);
    await user.click(screen.getByRole('button', { name: 'Não recebeu? Reenviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível reenviar o link. Tente novamente.');
    expect(screen.getByRole('button', { name: 'Não recebeu? Reenviar' })).toBeEnabled();
  });

  it('deve desabilitar o botão enquanto o reenvio está em andamento', async () => {
    const user = userEvent.setup();
    api.post.mockReturnValue(new Promise(() => {}));

    render(<ResendVerification email="joao@example.com" />);
    await user.click(screen.getByRole('button', { name: 'Não recebeu? Reenviar' }));

    expect(screen.getByRole('button', { name: 'Não recebeu? Reenviar' })).toBeDisabled();
  });
});
