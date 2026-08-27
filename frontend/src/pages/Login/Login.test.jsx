import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './Login';
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

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('deve exibir os campos do formulário', () => {
    renderWithRouter(<Login />);

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('deve autenticar, salvar o token e redirecionar para /canvas-test', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: { token: 'fake-jwt-token', user: { id: '1', email: 'joao@example.com' } },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-jwt-token');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/canvas-test');
  });

  it('deve exibir mensagem de erro para credenciais inválidas (401)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: { status: 401, data: { message: 'E-mail ou senha inválidos.' } },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'SenhaErrada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/e-mail ou senha inválidos/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('deve exibir mensagem de conta bloqueada com o tempo restante (423)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: {
        status: 423,
        data: { message: 'Conta bloqueada por excesso de tentativas. Tente novamente em 5 minuto(s).', minutesRemaining: 5 },
      },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/bloqueada.*5 minuto/i)).toBeInTheDocument();
  });
});