import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Register from './Register';
import api from '../../services/api';

vi.mock('../../services/api');

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Register', () => {
  it('deve exibir os campos do formulário', () => {
    renderWithRouter(<Register />);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
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
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'João',
        email: 'joao@example.com',
        password: 'senha12345',
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
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByText(/verifique seu e-mail/i)).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro quando o e-mail já existe (409)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: { status: 409, data: { message: 'E-mail já cadastrado.' } },
    });

    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByText(/e-mail já cadastrado/i)).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro genérica quando não há resposta do servidor', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('Network Error'));

    renderWithRouter(<Register />);

    await user.type(screen.getByLabelText(/nome/i), 'João');
    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText(/senha/i), 'senha12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByText(/erro ao cadastrar/i)).toBeInTheDocument();
  });
});