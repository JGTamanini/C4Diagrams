import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Register from './Register';
import api from '../../services/api';

vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Outra aba do mesmo navegador gravando no localStorage (o navegador avisa as demais com o evento "storage")
function storageFromOtherTab(key, newValue) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
  });
}

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Register', () => {
  it('deve exibir os campos do formulário', () => {
    renderWithRouter(<Register />);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument();
  });

  it('deve enviar os dados corretos para a API ao submeter', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: { id: '1', name: 'João', email: 'joao@example.com' },
    });

    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'João',
        email: 'joao@example.com',
        password: 'Senha@12345',
      });
    });
  });

  it('deve exibir mensagem de sucesso após cadastro', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: { id: '1', name: 'João', email: 'joao@example.com' },
    });

    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/verifique seu e-mail/i);
  });

  describe('depois do cadastro, esperando a verificação do e-mail', () => {
    async function registerAndWait() {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: '1', name: 'João', email: 'joao@example.com' } });
      renderWithRouter(<Register />);
      await user.type(screen.getByLabelText(/nome/i), 'João');
      await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
      await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
      await user.click(screen.getByRole('button', { name: /cadastrar/i }));
      await screen.findByRole('status');
    }

    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('deve ir para os projetos quando o link do e-mail entrar nesta conta em outra aba', async () => {
      await registerAndWait();

      storageFromOtherTab('token', 'header.payload.signature');
      storageFromOtherTab('user', '{"name":"João","email":"Joao@Example.com"}');

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/projetos', { replace: true });
    });

    it('não deve seguir quando outra conta entrar em outra aba', async () => {
      await registerAndWait();

      storageFromOtherTab('token', 'header.payload.signature');
      storageFromOtherTab('user', '{"name":"Maria","email":"maria@example.com"}');

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('deve ignorar saídas de sessão e dados que não sejam de um usuário', async () => {
      await registerAndWait();

      storageFromOtherTab('token', null);
      storageFromOtherTab('user', null);
      storageFromOtherTab('user', 'não é json');
      storageFromOtherTab('user', '{"name":"João"}');

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('não deve reagir antes de terminar o cadastro', () => {
      renderWithRouter(<Register />);

      storageFromOtherTab('user', '{"name":"João","email":"joao@example.com"}');

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('deve permitir reenviar o e-mail de verificação para o e-mail cadastrado', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: '1', name: 'João', email: 'joao@example.com' } });

    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    api.post.mockResolvedValue({ data: { message: 'Link reenviado.' } });
    await user.click(await screen.findByRole('button', { name: 'Não recebeu? Reenviar' }));

    expect(api.post).toHaveBeenLastCalledWith('/auth/resend-verification', { email: 'joao@example.com' });
  });

  it('deve exibir mensagem de erro quando o e-mail já existe (409)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: { status: 409, data: { message: 'E-mail já cadastrado.' } },
    });

    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByText(/e-mail já cadastrado/i)).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro genérica quando não há resposta do servidor', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('Network Error'));

    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByText(/erro ao cadastrar/i)).toBeInTheDocument();
  });

  it('deve indicar o carregamento enquanto cadastra, sem permitir envio duplo', async () => {
    const user = userEvent.setup();
    let finish;
    api.post.mockReturnValue(new Promise((resolve, reject) => { finish = reject; }));
    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(screen.getByRole('button', { name: 'Cadastrar' })).toHaveAttribute('aria-busy', 'true');

    finish({ response: { data: { message: 'E-mail já cadastrado.' } } });
    expect(await screen.findByText('E-mail já cadastrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeEnabled();
  });
});
