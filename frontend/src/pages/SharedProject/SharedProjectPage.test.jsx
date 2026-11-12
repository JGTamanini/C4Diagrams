import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SharedProjectPage from './SharedProjectPage';
import { getSharedProject } from '../../services/share';

vi.mock('../../services/share');
vi.mock('../../components/DiagramViewer/DiagramViewer', () => ({
  default: function MockViewer({ level, nodes, boundary }) {
    return (
      <div data-testid="viewer" data-level={level} data-boundary={boundary ? `${boundary.label} [${boundary.type}]` : ''}>
        {nodes.map((node) => node.data.label).join(', ')}
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/compartilhado/${TOKEN}`]}>
      <Routes>
        <Route path="/compartilhado/:token" element={<SharedProjectPage />} />
      </Routes>
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

    expect(await screen.findByTestId('viewer')).toHaveTextContent('Cliente, Loja');
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
});
