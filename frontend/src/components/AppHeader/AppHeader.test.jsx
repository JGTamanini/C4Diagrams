import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AppHeader from './AppHeader';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHeader() {
  return render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('deve exibir o nome do usuário e as iniciais do primeiro e último nome', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'João Gabriel Tamanini', email: 'joao@example.com' }));

    renderHeader();

    expect(screen.getByText('João Gabriel Tamanini')).toBeInTheDocument();
    expect(screen.getByText('JT')).toBeInTheDocument();
  });

  it('deve exibir apenas uma inicial quando o nome tiver uma palavra', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'joão', email: 'joao@example.com' }));

    renderHeader();

    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('deve funcionar sem usuário salvo, mantendo o botão Sair', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
  });

  it('deve encerrar a sessão e ir para o login ao clicar em Sair', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'header.payload.signature');
    localStorage.setItem('user', JSON.stringify({ name: 'João', email: 'joao@example.com' }));

    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
