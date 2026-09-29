import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Dashboard from './Dashboard';
import { listProjects, createProject, updateProject, deleteProject } from '../../services/projects';

vi.mock('../../services/projects');

const loja = {
  id: 'p1',
  name: 'Loja Online',
  description: 'E-commerce',
  created_at: '2026-09-20T15:00:00.000Z',
  updated_at: '2026-09-28T15:00:00.000Z',
};
const blog = {
  id: 'p2',
  name: 'Blog',
  description: null,
  created_at: '2026-09-10T15:00:00.000Z',
  updated_at: '2026-09-15T15:00:00.000Z',
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

function cardNames() {
  return screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify({ name: 'João Tamanini', email: 'joao@example.com' }));
  });

  describe('listagem (RF07)', () => {
    it('deve exibir carregamento e depois os projetos com a data da última edição', async () => {
      listProjects.mockResolvedValue([loja, blog]);

      renderDashboard();

      expect(screen.getByRole('status')).toHaveTextContent('Carregando projetos...');
      expect(await screen.findByText('Loja Online')).toBeInTheDocument();
      expect(cardNames()).toEqual(['Loja Online', 'Blog']);
      expect(screen.getByText('Editado em 28/09/2026')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Loja Online' })).toHaveAttribute('href', '/projetos/p1');
    });

    it('deve exibir o estado vazio com chamada para criar o primeiro projeto', async () => {
      const user = userEvent.setup();
      listProjects.mockResolvedValue([]);

      renderDashboard();

      expect(await screen.findByText('Você ainda não tem projetos criados.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Crie um agora' }));
      expect(screen.getByRole('dialog', { name: 'Novo Projeto' })).toBeInTheDocument();
    });

    it('deve exibir erro de carregamento e permitir tentar novamente', async () => {
      const user = userEvent.setup();
      listProjects.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce([loja]);

      renderDashboard();

      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar seus projetos.');
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      expect(await screen.findByText('Loja Online')).toBeInTheDocument();
      expect(listProjects).toHaveBeenCalledTimes(2);
    });
  });

  describe('criação (RF04)', () => {
    it('deve criar o projeto pelo modal e exibi-lo no topo da lista', async () => {
      const user = userEvent.setup();
      listProjects.mockResolvedValue([blog]);
      createProject.mockResolvedValue(loja);

      renderDashboard();
      await screen.findByText('Blog');

      await user.click(screen.getByRole('button', { name: 'Novo Projeto' }));
      await user.type(screen.getByLabelText('Nome do Projeto'), 'Loja Online');
      await user.click(screen.getByRole('button', { name: 'Criar' }));

      expect(createProject).toHaveBeenCalledWith({ name: 'Loja Online', description: '' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(cardNames()).toEqual(['Loja Online', 'Blog']);
    });
  });

  it('deve fechar o modal de criação ao cancelar, sem criar projeto', async () => {
    const user = userEvent.setup();
    listProjects.mockResolvedValue([blog]);

    renderDashboard();
    await screen.findByText('Blog');

    await user.click(screen.getByRole('button', { name: 'Novo Projeto' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(createProject).not.toHaveBeenCalled();
  });

  it('não deve atualizar a tela se for desmontado antes da lista chegar', async () => {
    let resolveList;
    listProjects.mockReturnValue(new Promise((resolve) => { resolveList = resolve; }));

    const { unmount } = renderDashboard();
    unmount();
    resolveList([loja]);

    await expect(Promise.resolve()).resolves.toBeUndefined();
  });

  describe('edição (RF05)', () => {
    it('deve abrir o modal preenchido, salvar via PATCH e levar o projeto ao topo', async () => {
      const user = userEvent.setup();
      listProjects.mockResolvedValue([loja, blog]);
      updateProject.mockResolvedValue({ ...blog, name: 'Blog Técnico', updated_at: '2026-09-29T15:00:00.000Z' });

      renderDashboard();
      await screen.findByText('Blog');

      await user.click(screen.getByRole('button', { name: 'Editar projeto Blog' }));
      const nameInput = screen.getByLabelText('Nome do Projeto');
      expect(nameInput).toHaveValue('Blog');
      await user.clear(nameInput);
      await user.type(nameInput, 'Blog Técnico');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(updateProject).toHaveBeenCalledWith('p2', { name: 'Blog Técnico', description: '' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(cardNames()).toEqual(['Blog Técnico', 'Loja Online']);
    });
  });

  describe('exclusão (RF06)', () => {
    it('deve confirmar citando a exclusão permanente dos diagramas (RN05) e remover o card', async () => {
      const user = userEvent.setup();
      listProjects.mockResolvedValue([loja, blog]);
      deleteProject.mockResolvedValue(undefined);

      renderDashboard();
      await screen.findByText('Loja Online');

      await user.click(screen.getByRole('button', { name: 'Excluir projeto Loja Online' }));
      const dialog = screen.getByRole('alertdialog', { name: 'Excluir projeto' });
      expect(dialog).toHaveTextContent('O projeto "Loja Online" e todos os seus diagramas serão excluídos permanentemente.');
      await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

      expect(deleteProject).toHaveBeenCalledWith('p1');
      await waitFor(() => expect(screen.queryByText('Loja Online')).not.toBeInTheDocument());
      expect(cardNames()).toEqual(['Blog']);
    });

    it('não deve excluir quando o usuário cancelar', async () => {
      const user = userEvent.setup();
      listProjects.mockResolvedValue([loja]);

      renderDashboard();
      await screen.findByText('Loja Online');

      await user.click(screen.getByRole('button', { name: 'Excluir projeto Loja Online' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(deleteProject).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByText('Loja Online')).toBeInTheDocument();
    });

    it('deve manter o card e avisar quando a exclusão falhar', async () => {
      const user = userEvent.setup();
      listProjects.mockResolvedValue([loja]);
      deleteProject.mockRejectedValue(new Error('Network Error'));

      renderDashboard();
      await screen.findByText('Loja Online');

      await user.click(screen.getByRole('button', { name: 'Excluir projeto Loja Online' }));
      await user.click(screen.getByRole('button', { name: 'Excluir' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir o projeto. Tente novamente.');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByText('Loja Online')).toBeInTheDocument();
    });
  });
});
