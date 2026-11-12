import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SharedProjectPage from './SharedProjectPage';
import { getSharedProject } from '../../services/share';

vi.mock('../../services/share');
vi.mock('../../components/DiagramViewer/DiagramViewer', () => ({
  default: function MockViewer({ level, nodes, boundary, selectedId, onSelectElement }) {
    return (
      <div
        data-testid="viewer"
        data-level={level}
        data-selected={selectedId ?? ''}
        data-boundary={boundary ? `${boundary.label} [${boundary.type}]` : ''}
      >
        {nodes.map((node) => (
          <button key={node.id} type="button" onClick={() => onSelectElement(node.id)}>
            {node.data.label}
          </button>
        ))}
      </div>
    );
  },
}));

const TOKEN = 'abcDEF123_-abcDEF123_-abcDEF1234';
const node = (id, type, label) => ({ id, type, position: { x: 0, y: 0 }, data: { label } });
const shared = {
  name: 'Loja Online',
  description: 'Loja de livros',
  ownerName: 'Ana Dona',
  updatedAt: '2026-11-12T13:05:00.000Z',
  diagrams: [
    { level: 'context', data: { nodes: [node('u', 'c4-person', 'Cliente'), node('s', 'c4-system', 'Loja')], edges: [] } },
    { level: 'container', data: { nodes: [node('c', 'c4-container', 'API')], edges: [] } },
  ],
};

const OTHER_TOKEN = 'zzzDEF123_-abcDEF123_-abcDEF1234';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/compartilhado/${TOKEN}`]}>
      <Routes>
        <Route path="/compartilhado/:token" element={<SharedProjectPage />} />
      </Routes>
      <Link to={`/compartilhado/${OTHER_TOKEN}`}>outro link</Link>
    </MemoryRouter>
  );
}

describe('SharedProjectPage (link de visualização)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve abrir o projeto do link, com quem compartilhou e a data da última alteração', async () => {
    getSharedProject.mockResolvedValue(shared);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Loja Online' })).toBeInTheDocument();
    expect(getSharedProject).toHaveBeenCalledWith(TOKEN);
    const when = new Date(shared.updatedAt);
    const date = when.toLocaleDateString('pt-BR');
    const time = when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    expect(screen.getByText(`Compartilhado por Ana Dona · Última alteração: ${date} às ${time}`)).toBeInTheDocument();
    expect(screen.getByText(/só visualização/i)).toBeInTheDocument();
  });

  it('deve mostrar o Contexto e trocar de nível pelas abas, com a fronteira do elemento detalhado', async () => {
    const user = userEvent.setup();
    getSharedProject.mockResolvedValue(shared);
    renderPage();

    expect(await screen.findByTestId('viewer')).toHaveTextContent('ClienteLoja');
    await user.click(screen.getByRole('tab', { name: 'Container' }));

    const viewer = screen.getByTestId('viewer');
    expect(viewer).toHaveAttribute('data-level', 'container');
    expect(viewer).toHaveTextContent('API');
    expect(viewer).toHaveAttribute('data-boundary', 'Loja [Software System]');
  });

  it('deve explicar quando o link é inválido ou foi revogado', async () => {
    getSharedProject.mockRejectedValue({
      response: { status: 404, data: { message: 'Este link de visualização é inválido ou foi revogado.' } },
    });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Este link de visualização é inválido ou foi revogado.');
    expect(screen.getByRole('link', { name: /meus projetos/i })).toHaveAttribute('href', '/projetos');
  });

  // Painel de detalhes: a descrição completa e as relações, que no diagrama ficam resumidas
  describe('detalhes do elemento', () => {
    it('deve abrir os detalhes do elemento clicado e fechar pelo X', async () => {
      const user = userEvent.setup();
      getSharedProject.mockResolvedValue(shared);
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Loja' }));

      expect(screen.getByRole('complementary', { name: 'Detalhes do elemento' })).toHaveTextContent('[Software System]');
      expect(screen.getByTestId('viewer')).toHaveAttribute('data-selected', 's');
      await user.click(screen.getByRole('button', { name: 'Fechar detalhes' }));

      expect(screen.queryByRole('complementary', { name: 'Detalhes do elemento' })).not.toBeInTheDocument();
      expect(screen.getByTestId('viewer')).toHaveAttribute('data-selected', '');
    });

    it('o elemento detalhado deve levar ao nível que o detalha, e o de dentro mostrar de quem faz parte', async () => {
      const user = userEvent.setup();
      getSharedProject.mockResolvedValue(shared);
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Loja' }));
      await user.click(screen.getByRole('button', { name: 'Ver o nível Container' }));

      expect(screen.getByTestId('viewer')).toHaveAttribute('data-level', 'container');
      expect(screen.queryByRole('complementary', { name: 'Detalhes do elemento' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'API' }));

      expect(screen.getByRole('complementary', { name: 'Detalhes do elemento' })).toHaveTextContent('Loja [Software System]');
    });

    it('elementos de fora da fronteira e sem nível próprio não mostram "Parte de" nem o botão de nível', async () => {
      const user = userEvent.setup();
      getSharedProject.mockResolvedValue(shared);
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Cliente' }));

      const panel = screen.getByRole('complementary', { name: 'Detalhes do elemento' });
      expect(panel).not.toHaveTextContent('Parte de');
      expect(screen.queryByRole('button', { name: /ver o nível/i })).not.toBeInTheDocument();
    });

    it('trocar de nível pelas abas deve fechar os detalhes', async () => {
      const user = userEvent.setup();
      getSharedProject.mockResolvedValue(shared);
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Cliente' }));
      await user.click(screen.getByRole('tab', { name: 'Container' }));

      expect(screen.queryByRole('complementary', { name: 'Detalhes do elemento' })).not.toBeInTheDocument();
    });
  });

  // Review da #80: ir de um link para outro sem recarregar não pode mostrar o erro (ou o projeto) do link anterior
  it('deve recomeçar ao trocar de link sem recarregar a página', async () => {
    const user = userEvent.setup();
    getSharedProject.mockImplementation((token) =>
      token === TOKEN
        ? Promise.reject({ response: { status: 404, data: { message: 'Link revogado.' } } })
        : Promise.resolve(shared)
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Link revogado.');
    await user.click(screen.getByRole('link', { name: 'outro link' }));

    expect(await screen.findByRole('heading', { name: 'Loja Online' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
