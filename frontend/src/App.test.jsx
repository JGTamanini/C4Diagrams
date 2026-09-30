import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App';
import { listProjects, getProject } from './services/projects';

vi.mock('./services/projects');
vi.mock('./components/Canvas/Canvas', () => ({ default: () => <div data-testid="canvas" /> }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('App - rotas de projetos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it.each(['/projetos', '/projetos/p1'])('deve redirecionar %s para o login quando não houver sessão (RN01)', (path) => {
    renderAt(path);

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('deve exibir o dashboard em /projetos para usuário autenticado', async () => {
    localStorage.setItem('token', 'header.payload.signature');
    listProjects.mockResolvedValue([]);

    renderAt('/projetos');

    expect(await screen.findByRole('heading', { name: 'Meus Projetos' })).toBeInTheDocument();
  });

  it('deve exibir a página do projeto em /projetos/:id para usuário autenticado', async () => {
    localStorage.setItem('token', 'header.payload.signature');
    getProject.mockResolvedValue({ id: 'p1', name: 'Loja Online', description: null });

    renderAt('/projetos/p1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Loja Online' })).toBeInTheDocument();
  });
});

describe('App - telas públicas com usuário logado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'header.payload.signature');
    listProjects.mockResolvedValue([]);
  });

  it.each(['/login', '/cadastro', '/forgot-password'])('deve levar %s para /projetos', async (path) => {
    renderAt(path);

    expect(await screen.findByRole('heading', { name: 'Meus Projetos' })).toBeInTheDocument();
  });

  it('deve manter /reset-password acessível, pois é aberta por link de e-mail', () => {
    renderAt('/reset-password?token=abc');

    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();
  });

  it('deve manter /verify-email acessível, pois é aberta por link de e-mail', () => {
    renderAt('/verify-email?token=abc');

    expect(screen.getByText('Verificando...')).toBeInTheDocument();
  });
});
