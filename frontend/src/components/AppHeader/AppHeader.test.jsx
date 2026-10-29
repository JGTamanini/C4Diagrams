import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AppHeader from './AppHeader';
import { deleteAccount } from '../../services/users';

vi.mock('../../services/users');

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
    vi.clearAllMocks();
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

  describe('menu da conta', () => {
    function loggedIn() {
      localStorage.setItem('token', 'header.payload.signature');
      localStorage.setItem('user', JSON.stringify({ name: 'João Tamanini', email: 'joao@example.com' }));
    }

    async function openMenu(user) {
      await user.click(screen.getByRole('button', { name: 'Conta de João Tamanini' }));
      return screen.getByRole('menu');
    }

    it('deve abrir pelo nome do usuário com as opções Excluir conta e Sair, e fechar com Esc', async () => {
      const user = userEvent.setup();
      loggedIn();
      renderHeader();
      const trigger = screen.getByRole('button', { name: 'Conta de João Tamanini' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      const menu = await openMenu(user);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Excluir conta', 'Sair']);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('deve fechar ao clicar fora', async () => {
      const user = userEvent.setup();
      loggedIn();
      renderHeader();
      await openMenu(user);

      await user.click(document.body);

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('deve encerrar a sessão e voltar para a página inicial ao clicar em Sair', async () => {
      const user = userEvent.setup();
      loggedIn();
      renderHeader();

      await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Sair' }));

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('deve excluir a conta confirmando a senha, encerrar a sessão e voltar para a página inicial', async () => {
      const user = userEvent.setup();
      loggedIn();
      deleteAccount.mockResolvedValue(undefined);
      renderHeader();

      await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Excluir conta' }));
      const dialog = screen.getByRole('dialog', { name: 'Excluir conta' });
      expect(dialog).toHaveTextContent('Todos os seus projetos e diagramas serão excluídos permanentemente.');
      await user.type(within(dialog).getByLabelText('Senha atual'), 'Senha@12345');
      await user.click(within(dialog).getByRole('button', { name: 'Excluir minha conta' }));

      expect(deleteAccount).toHaveBeenCalledWith('Senha@12345');
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('deve avisar senha incorreta sem encerrar a sessão', async () => {
      const user = userEvent.setup();
      loggedIn();
      deleteAccount.mockRejectedValue({ response: { status: 403, data: { message: 'Senha incorreta.' } } });
      renderHeader();

      await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Excluir conta' }));
      await user.type(screen.getByLabelText('Senha atual'), 'Errada@123');
      await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta.');
      expect(localStorage.getItem('token')).not.toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('não deve enviar sem a senha', async () => {
      const user = userEvent.setup();
      loggedIn();
      renderHeader();

      await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Excluir conta' }));
      await user.click(screen.getByRole('button', { name: 'Excluir minha conta' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Informe sua senha para confirmar.');
      expect(deleteAccount).not.toHaveBeenCalled();
    });

    it('deve fechar o modal ao cancelar, sem excluir', async () => {
      const user = userEvent.setup();
      loggedIn();
      renderHeader();

      await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Excluir conta' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(deleteAccount).not.toHaveBeenCalled();
    });
  });
});
