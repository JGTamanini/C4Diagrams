import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import api from '../../services/api';

vi.mock('../../services/api');

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ForgotPassword', () => {
  it('deve exibir o campo de e-mail e o botão de envio', () => {
    renderWithRouter(<ForgotPassword />);

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
  });

  it('deve chamar a API e exibir mensagem de sucesso', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: { message: 'Se esse e-mail estiver cadastrado, um link de recuperação foi enviado.' },
    });

    renderWithRouter(<ForgotPassword />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'joao@example.com' });
    expect(await screen.findByText(/se esse e-mail estiver cadastrado/i)).toBeInTheDocument();
  });
});