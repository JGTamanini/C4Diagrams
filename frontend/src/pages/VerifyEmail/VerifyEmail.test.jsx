import { StrictMode } from 'react';
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

const session = { token: 'header.payload.signature', user: { id: 'u1', name: 'João', email: 'joao@example.com' } };

describe('VerifyEmail', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve exibir mensagem de carregamento inicialmente', () => {
    api.post.mockReturnValue(new Promise(() => {})); // nunca resolve, simula "ainda carregando"

    renderWithToken('token-valido');

    expect(screen.getByText(/verificando/i)).toBeInTheDocument();
  });

  it('deve entrar na conta e dizer que esta guia pode ser fechada (a aba do cadastro segue sozinha)', async () => {
    api.post.mockResolvedValue({ data: { message: 'E-mail verificado com sucesso.', ...session } });

    renderWithToken('token-valido');

    expect(await screen.findByText('E-mail verificado! Pode fechar esta guia: a aba do cadastro já entrou na sua conta.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'token-valido' });
    expect(localStorage.getItem('token')).toBe(session.token);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ name: 'João', email: 'joao@example.com' });
  });

  it('deve verificar uma vez só, mesmo quando o efeito roda duas vezes (StrictMode): o link vale uma vez', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'E-mail verificado com sucesso.', ...session } });
    api.post.mockRejectedValue({ response: { status: 400, data: { message: 'Token inválido ou expirado.' } } });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/verify-email?token=token-valido']}>
          <VerifyEmail />
        </MemoryRouter>
      </StrictMode>
    );

    expect(await screen.findByRole('link', { name: 'Ir para meus projetos' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Token inválido ou expirado.')).not.toBeInTheDocument();
  });

  it('deve oferecer o atalho para os projetos, para quem abriu o link em outro aparelho', async () => {
    api.post.mockResolvedValue({ data: { message: 'E-mail verificado com sucesso.', ...session } });

    renderWithToken('token-valido');

    expect(await screen.findByRole('link', { name: 'Ir para meus projetos' })).toHaveAttribute('href', '/projetos');
    expect(screen.getByText('Abriu o link em outro aparelho?')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir para o login' })).not.toBeInTheDocument();
  });

  it('deve exibir mensagem de erro quando o token é inválido ou expirado', async () => {
    api.post.mockRejectedValue({
      response: { status: 400, data: { message: 'Token inválido ou expirado.' } },
    });

    renderWithToken('token-invalido');

    expect(await screen.findByText(/token inválido ou expirado/i)).toBeInTheDocument();
  });

  it('deve exibir erro genérico sem entrar na conta quando o servidor não responder', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));

    renderWithToken('token-valido');

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao verificar e-mail.');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('deve oferecer o reenvio do link quando o token for inválido ou expirado', async () => {
    api.post.mockRejectedValue({
      response: { status: 400, data: { message: 'Token inválido ou expirado.' } },
    });

    renderWithToken('token-invalido');

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar link' })).toBeInTheDocument();
  });

  it('não deve oferecer o reenvio quando a verificação der certo', async () => {
    api.post.mockResolvedValue({ data: { message: 'E-mail verificado com sucesso.', ...session } });

    renderWithToken('token-valido');

    expect(await screen.findByRole('link', { name: 'Ir para meus projetos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reenviar link' })).not.toBeInTheDocument();
  });
});