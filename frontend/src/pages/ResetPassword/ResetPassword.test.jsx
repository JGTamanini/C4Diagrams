import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ResetPassword from './ResetPassword';
import api from '../../services/api';

vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithToken(token) {
  return render(
    <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
      <ResetPassword />
    </MemoryRouter>
  );
}

describe('ResetPassword', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('deve exibir o campo de nova senha e o botão de envio', () => {
    renderWithToken('token-valido');

    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redefinir/i })).toBeInTheDocument();
  });

  it('deve redefinir a senha com sucesso e redirecionar para /login', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { message: 'Senha redefinida com sucesso.' } });

    renderWithToken('token-valido');

    await user.type(screen.getByLabelText(/nova senha/i), 'NovaSenha@123');
    await user.click(screen.getByRole('button', { name: /redefinir/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'token-valido',
      newPassword: 'NovaSenha@123',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('deve exibir mensagem de erro para token inválido ou expirado', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: { status: 400, data: { message: 'Token inválido ou expirado.' } },
    });

    renderWithToken('token-invalido');

    await user.type(screen.getByLabelText(/nova senha/i), 'NovaSenha@123');
    await user.click(screen.getByRole('button', { name: /redefinir/i }));

    expect(await screen.findByText(/token inválido ou expirado/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});