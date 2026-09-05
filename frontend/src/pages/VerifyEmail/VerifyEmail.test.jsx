import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import VerifyEmail from './VerifyEmail';
import api from '../../services/api';

vi.mock('../../services/api');

function renderWithToken(token) {
  return render(
    <MemoryRouter initialEntries={[`/verify-email?token=${token}`]}>
      <VerifyEmail />
    </MemoryRouter>
  );
}

describe('VerifyEmail', () => {
  it('deve exibir mensagem de carregamento inicialmente', () => {
    api.post.mockReturnValue(new Promise(() => {})); // nunca resolve, simula "ainda carregando"

    renderWithToken('token-valido');

    expect(screen.getByText(/verificando/i)).toBeInTheDocument();
  });

  it('deve exibir mensagem de sucesso quando o token é válido', async () => {
    api.post.mockResolvedValue({ data: { message: 'E-mail verificado com sucesso.' } });

    renderWithToken('token-valido');

    expect(await screen.findByText(/verificado com sucesso/i)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'token-valido' });
  });

  it('deve exibir mensagem de erro quando o token é inválido ou expirado', async () => {
    api.post.mockRejectedValue({
      response: { status: 400, data: { message: 'Token inválido ou expirado.' } },
    });

    renderWithToken('token-invalido');

    expect(await screen.findByText(/token inválido ou expirado/i)).toBeInTheDocument();
  });
});