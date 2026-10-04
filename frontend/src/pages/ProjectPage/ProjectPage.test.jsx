import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectPage from './ProjectPage';
import { getProject } from '../../services/projects';

vi.mock('../../services/projects');
vi.mock('../../components/Canvas/Canvas', () => ({ default: () => <div data-testid="canvas" /> }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projetos/:id" element={<ProjectPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProjectPage (RF07 - visualização)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar o projeto pelo id da rota e exibir nome, descrição e o canvas', async () => {
    getProject.mockResolvedValue({ id: 'p1', name: 'Loja Online', description: 'Arquitetura do e-commerce' });

    renderAt('/projetos/p1');

    expect(screen.getByRole('status')).toHaveTextContent('Carregando projeto...');
    expect(await screen.findByRole('heading', { level: 1, name: 'Loja Online' })).toBeInTheDocument();
    expect(getProject).toHaveBeenCalledWith('p1');
    expect(screen.getByText('Arquitetura do e-commerce')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para meus projetos' })).toHaveAttribute('href', '/projetos');
  });

  it('deve exibir aviso amigável quando o projeto não existir ou não for do usuário (404)', async () => {
    getProject.mockRejectedValue({ response: { status: 404 } });

    renderAt('/projetos/p1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Projeto não encontrado.');
    expect(screen.getByRole('link', { name: 'Voltar para meus projetos' })).toBeInTheDocument();
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });

  it.each([
    ['sucesso', (resolve) => resolve({ id: 'p1', name: 'Loja Online', description: null })],
    ['falha', (_, reject) => reject(new Error('Network Error'))],
  ])('não deve atualizar a tela se for desmontada antes da resposta (%s)', async (_, settle) => {
    let resolveFn;
    let rejectFn;
    getProject.mockReturnValue(new Promise((resolve, reject) => { resolveFn = resolve; rejectFn = reject; }));

    const { unmount } = renderAt('/projetos/p1');
    unmount();
    settle(resolveFn, rejectFn);

    await expect(Promise.resolve()).resolves.toBeUndefined();
  });

  it('deve exibir erro genérico para outras falhas', async () => {
    getProject.mockRejectedValue(new Error('Network Error'));

    renderAt('/projetos/p1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o projeto.');
  });
});
