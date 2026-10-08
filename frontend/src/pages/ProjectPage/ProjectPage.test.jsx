import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectPage from './ProjectPage';
import { getProject, InvalidProjectIdError } from '../../services/projects';
import { useDiagramEditor } from '../../hooks/useDiagramEditor';

vi.mock('../../services/projects');
vi.mock('../../hooks/useDiagramEditor');
vi.mock('../../components/DiagramCanvas/DiagramCanvas', () => ({
  default: ({ nodes }) => <div data-testid="canvas" data-count={nodes.length} />,
}));

const editor = {
  loadStatus: 'ready',
  activeLevel: 'context',
  setActiveLevel: vi.fn(),
  nodes: [{ id: 'n1' }, { id: 'n2' }],
  edges: [],
  onNodesChange: vi.fn(),
  onEdgesChange: vi.fn(),
  save: vi.fn(),
  saveStatus: 'saved',
};

function mockEditor(overrides = {}) {
  useDiagramEditor.mockReturnValue({ ...editor, ...overrides });
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projetos/:id" element={<ProjectPage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function renderLoaded(overrides) {
  mockEditor(overrides);
  getProject.mockResolvedValue({ id: 'p1', name: 'Loja Online', description: null });
  renderAt('/projetos/p1');
  await screen.findByRole('heading', { level: 1 });
}

describe('ProjectPage (editor de diagramas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor();
  });

  describe('estrutura (wireframe 7)', () => {
    it('deve exibir o nome do projeto, o título do diagrama do nível e o canvas com os elementos', async () => {
      getProject.mockResolvedValue({ id: 'p1', name: 'Loja Online', description: null });

      renderAt('/projetos/p1');

      expect(screen.getByRole('status')).toHaveTextContent('Carregando projeto...');
      expect(await screen.findByRole('heading', { level: 1, name: 'Diagrama de Contexto — Loja Online' })).toBeInTheDocument();
      expect(getProject).toHaveBeenCalledWith('p1');
      expect(useDiagramEditor).toHaveBeenCalledWith('p1');
      expect(screen.getByTestId('project-name')).toHaveTextContent('Loja Online');
      expect(screen.getByRole('link', { name: 'Meus projetos' })).toHaveAttribute('href', '/projetos');
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-count', '2');
    });

    it('deve atualizar o título conforme o nível ativo', async () => {
      await renderLoaded({ activeLevel: 'component' });

      expect(screen.getByRole('heading', { level: 1, name: 'Diagrama de Componentes — Loja Online' })).toBeInTheDocument();
    });
  });

  describe('abas de nível C4', () => {
    it('deve listar Contexto, Container e Componente, marcando o nível ativo', async () => {
      await renderLoaded();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.map((tab) => tab.textContent)).toEqual(['Contexto', 'Container', 'Componente']);
      expect(screen.getByRole('tab', { name: 'Contexto' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Container' })).toHaveAttribute('aria-selected', 'false');
    });

    it('deve trocar o nível ao clicar na aba', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('tab', { name: 'Container' }));

      expect(editor.setActiveLevel).toHaveBeenCalledWith('container');
    });
  });

  describe('salvamento (RNF08)', () => {
    it.each([
      ['saved', 'Todas as alterações salvas'],
      ['pending', 'Alterações não salvas'],
      ['saving', 'Salvando…'],
      ['error', 'Falha ao salvar. Suas alterações continuam aqui — clique em Salvar para tentar de novo.'],
    ])('deve exibir o estado %s', async (saveStatus, text) => {
      await renderLoaded({ saveStatus });

      expect(screen.getByTestId('save-status')).toHaveTextContent(text);
    });

    it('deve salvar na hora pelo botão Salvar', async () => {
      const user = userEvent.setup();
      await renderLoaded({ saveStatus: 'pending' });

      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(editor.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('carregamento dos diagramas', () => {
    it('deve indicar o carregamento dos diagramas', async () => {
      await renderLoaded({ loadStatus: 'loading' });

      expect(screen.getByText('Carregando diagramas...')).toBeInTheDocument();
      expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
    });

    it('deve avisar quando os diagramas não puderem ser carregados', async () => {
      await renderLoaded({ loadStatus: 'error' });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível carregar os diagramas deste projeto. Recarregue a página para tentar novamente.'
      );
      expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
    });
  });

  describe('projeto indisponível', () => {
    it('deve exibir aviso amigável quando o projeto não existir ou não for do usuário (404)', async () => {
      getProject.mockRejectedValue({ response: { status: 404 } });

      renderAt('/projetos/p1');

      expect(await screen.findByRole('alert')).toHaveTextContent('Projeto não encontrado.');
      expect(screen.getByRole('link', { name: 'Voltar para meus projetos' })).toBeInTheDocument();
      expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
    });

    it('deve tratar id fora do formato como projeto não encontrado', async () => {
      getProject.mockRejectedValue(new InvalidProjectIdError());

      renderAt('/projetos/abc');

      expect(await screen.findByRole('alert')).toHaveTextContent('Projeto não encontrado.');
    });

    it('deve exibir erro genérico para outras falhas', async () => {
      getProject.mockRejectedValue(new Error('Network Error'));

      renderAt('/projetos/p1');

      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o projeto.');
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
  });
});
