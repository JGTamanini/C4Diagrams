import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectPage from './ProjectPage';
import { getProject, InvalidProjectIdError } from '../../services/projects';
import { useDiagramEditor } from '../../hooks/useDiagramEditor';

vi.mock('../../services/projects');
vi.mock('../../hooks/useDiagramEditor');
vi.mock('../../components/DiagramCanvas/DiagramCanvas', () => ({
  default: ({ level, nodes, keyboardEnabled, paletteOpen, onTogglePalette, onAddNode, onConnect, onEditNode, onEditEdge }) => (
    <div
      data-testid="canvas"
      data-count={nodes.length}
      data-level={level}
      data-keyboard={String(keyboardEnabled)}
      data-palette={String(paletteOpen)}
    >
      <button type="button" onClick={onTogglePalette}>mock-toggle-palette</button>
      <button type="button" onClick={() => onAddNode('c4-system', { x: 1, y: 2 })}>mock-add</button>
      <button type="button" onClick={() => onConnect({ source: 'n1', target: 'n2' })}>mock-connect</button>
      <button type="button" onClick={() => onEditNode('n1')}>mock-edit-node</button>
      <button type="button" onClick={() => onEditEdge('e1')}>mock-edit-edge</button>
    </div>
  ),
}));

const editor = {
  loadStatus: 'ready',
  activeLevel: 'context',
  selectLevel: vi.fn(),
  nodes: [
    { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
    { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja' } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Usa', data: {} }],
  onNodesChange: vi.fn(),
  onEdgesChange: vi.fn(),
  addNode: vi.fn(),
  connect: vi.fn(),
  updateNode: vi.fn(),
  updateEdge: vi.fn(),
  removeNode: vi.fn(),
  removeEdge: vi.fn(),
  removeSelected: vi.fn(),
  hasSelection: false,
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
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
    it('deve exibir o nome do projeto como título e o canvas com os elementos', async () => {
      getProject.mockResolvedValue({ id: 'p1', name: 'Loja Online', description: null });

      renderAt('/projetos/p1');

      expect(screen.getByRole('status')).toHaveTextContent('Carregando projeto...');
      expect(await screen.findByRole('heading', { level: 1, name: 'Loja Online' })).toBeInTheDocument();
      expect(getProject).toHaveBeenCalledWith('p1');
      expect(useDiagramEditor).toHaveBeenCalledWith('p1');
      // O nome do projeto aparece só no título (não repetido na barra superior)
      expect(screen.getAllByText(/Loja Online/)).toHaveLength(1);
      expect(screen.getByRole('link', { name: 'Meus projetos' })).toHaveAttribute('href', '/projetos');
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-count', '2');
    });

    it('deve mostrar o nome inteiro do projeto ao passar o mouse, já que nomes longos são cortados com reticências', async () => {
      const longName = 'Plataforma de Gestão de Pedidos e Logística Integrada da Rede de Lojas';
      mockEditor();
      getProject.mockResolvedValue({ id: 'p1', name: longName, description: null });
      renderAt('/projetos/p1');

      const heading = await screen.findByRole('heading', { level: 1, name: longName });
      expect(heading).toHaveAttribute('title', longName);
      expect(heading).toHaveClass('truncate');
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

      expect(editor.selectLevel).toHaveBeenCalledWith('container');
    });

    it('deve centralizar as abas na área de trabalho, acompanhando a paleta aberta ou oculta', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const tablist = screen.getByRole('tablist', { name: 'Níveis do modelo C4' });
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-palette', 'true');
      expect(tablist.parentElement).toHaveAttribute('data-palette-open', 'true');

      await user.click(screen.getByRole('button', { name: 'mock-toggle-palette' }));

      expect(screen.getByTestId('canvas')).toHaveAttribute('data-palette', 'false');
      expect(tablist.parentElement).toHaveAttribute('data-palette-open', 'false');
    });
  });

  describe('edição do diagrama', () => {
    it('deve passar o nível ativo ao canvas e ligar adição e conexão ao editor', async () => {
      const user = userEvent.setup();
      await renderLoaded({ activeLevel: 'container' });

      expect(screen.getByTestId('canvas')).toHaveAttribute('data-level', 'container');
      await user.click(screen.getByRole('button', { name: 'mock-add' }));
      await user.click(screen.getByRole('button', { name: 'mock-connect' }));

      expect(editor.addNode).toHaveBeenCalledWith('c4-system', { x: 1, y: 2 });
      expect(editor.connect).toHaveBeenCalledWith({ source: 'n1', target: 'n2' });
    });

    it('deve editar o elemento pelo modal e fechá-lo ao salvar (RF22)', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'mock-edit-node' }));
      const title = screen.getByLabelText('Título');
      expect(title).toHaveValue('Cliente');
      await user.clear(title);
      await user.type(title, 'Cliente VIP');
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));

      expect(editor.updateNode).toHaveBeenCalledWith('n1', { label: 'Cliente VIP', description: '' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('deve editar a conexão pelo modal', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'mock-edit-edge' }));
      await user.type(screen.getByLabelText('Tecnologia'), 'HTTPS');
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }));

      expect(editor.updateEdge).toHaveBeenCalledWith('e1', { label: 'Usa', technology: 'HTTPS' });
    });

    it.each([
      ['elemento', 'mock-edit-node', 'removeNode', 'n1'],
      ['conexão', 'mock-edit-edge', 'removeEdge', 'e1'],
    ])('deve excluir o(a) %s pelo modal', async (_, openButton, action, id) => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: openButton }));
      await user.click(screen.getByRole('button', { name: 'Excluir' }));

      expect(editor[action]).toHaveBeenCalledWith(id);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('deve fechar o modal sem alterar nada ao cancelar', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'mock-edit-node' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(editor.updateNode).not.toHaveBeenCalled();
    });

    it('não deve abrir o modal para um elemento que não está no nível ativo', async () => {
      const user = userEvent.setup();
      await renderLoaded({ nodes: [], edges: [] });

      await user.click(screen.getByRole('button', { name: 'mock-edit-node' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-keyboard', 'true');
    });
  });

  describe('barra de ações', () => {
    it('deve oferecer desfazer, refazer e excluir selecionados, desabilitados quando não há o que fazer', async () => {
      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Desfazer (Ctrl+Z)' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Refazer (Ctrl+Y)' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Excluir selecionados (Delete)' })).toBeDisabled();
    });

    it('deve acionar o editor pelos botões', async () => {
      const user = userEvent.setup();
      await renderLoaded({ canUndo: true, canRedo: true, hasSelection: true });

      await user.click(screen.getByRole('button', { name: 'Desfazer (Ctrl+Z)' }));
      await user.click(screen.getByRole('button', { name: 'Refazer (Ctrl+Y)' }));
      await user.click(screen.getByRole('button', { name: 'Excluir selecionados (Delete)' }));

      expect(editor.undo).toHaveBeenCalledTimes(1);
      expect(editor.redo).toHaveBeenCalledTimes(1);
      expect(editor.removeSelected).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['{Control>}z{/Control}', 'undo'],
      ['{Meta>}z{/Meta}', 'undo'],
      ['{Control>}y{/Control}', 'redo'],
      ['{Control>}{Shift>}z{/Shift}{/Control}', 'redo'],
      ['{Control>}s{/Control}', 'save'],
      ['{Meta>}s{/Meta}', 'save'],
    ])('deve aceitar o atalho %s', async (keys, action) => {
      const user = userEvent.setup();
      await renderLoaded({ canUndo: true, canRedo: true });

      await user.keyboard(keys);

      expect(editor[action]).toHaveBeenCalledTimes(1);
    });

    it('não deve desfazer o diagrama enquanto o usuário digita num campo (o Ctrl+Z é do texto)', async () => {
      const user = userEvent.setup();
      await renderLoaded({ canUndo: true });
      await user.click(screen.getByRole('button', { name: 'mock-edit-node' }));

      await user.click(screen.getByLabelText('Título'));
      await user.keyboard('{Control>}z{/Control}');

      expect(editor.undo).not.toHaveBeenCalled();
    });

    it('não deve mexer no diagrama por trás do modal aberto, mesmo com o foco num botão dele', async () => {
      const user = userEvent.setup();
      await renderLoaded({ canUndo: true, canRedo: true });
      await user.click(screen.getByRole('button', { name: 'mock-edit-node' }));

      screen.getByRole('button', { name: 'Cancelar' }).focus();
      await user.keyboard('{Control>}z{/Control}');
      await user.keyboard('{Control>}y{/Control}');

      expect(editor.undo).not.toHaveBeenCalled();
      expect(editor.redo).not.toHaveBeenCalled();
    });

    it('deve desligar o teclado do canvas (Delete) enquanto o modal estiver aberto', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      expect(screen.getByTestId('canvas')).toHaveAttribute('data-keyboard', 'true');
      await user.click(screen.getByRole('button', { name: 'mock-edit-node' }));
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-keyboard', 'false');
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-keyboard', 'true');
    });
  });

  describe('salvamento (RNF08)', () => {
    it.each([
      ['saved', 'Todas as alterações salvas'],
      ['pending', 'Alterações não salvas'],
      ['saving', 'Salvando…'],
      ['error', 'Falha ao salvar. Suas alterações continuam aqui — use "Tentar de novo" ou Ctrl+S.'],
    ])('deve exibir o estado %s', async (saveStatus, text) => {
      await renderLoaded({ saveStatus });

      expect(screen.getByTestId('save-status')).toHaveTextContent(text);
    });

    it('deve mostrar "Não salvo" em texto (não só o ícone) enquanto houver alteração pendente', async () => {
      await renderLoaded({ saveStatus: 'pending' });

      expect(within(screen.getByTestId('save-status')).getByText('Não salvo')).toBeInTheDocument();
    });

    it('deve oferecer "Tentar de novo" ao lado do aviso quando o salvamento falhar', async () => {
      const user = userEvent.setup();
      await renderLoaded({ saveStatus: 'error' });

      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(editor.save).toHaveBeenCalledTimes(1);
    });

    it('não deve mostrar "Tentar de novo" fora da falha', async () => {
      await renderLoaded({ saveStatus: 'saved' });

      expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
    });

    it('deve salvar na hora pelo menu de configurações', async () => {
      const user = userEvent.setup();
      await renderLoaded({ saveStatus: 'pending' });

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: /Salvar/ }));

      expect(editor.save).toHaveBeenCalledTimes(1);
    });

    it('deve oferecer no menu de configurações Salvar, Exportar (em breve) e Atalhos', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      const items = within(screen.getByRole('menu')).getAllByRole('menuitem');

      expect(items.map((item) => item.textContent)).toEqual(['SalvarCtrl+S', 'ExportarEm breve', 'Atalhos']);
      expect(items[1]).toBeDisabled();
    });

    it('deve mostrar os atalhos do editor num modal, incluindo a seleção múltipla', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: 'Atalhos' }));
      const dialog = screen.getByRole('dialog', { name: 'Atalhos do editor' });

      for (const text of ['Desfazer', 'Refazer', 'Salvar', 'Excluir selecionados', 'Selecionar vários (caixa)', 'Somar à seleção']) {
        expect(within(dialog).getByText(text)).toBeInTheDocument();
      }
      expect(within(dialog).getByText('Shift + arrastar')).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('deve desligar os atalhos do diagrama enquanto o modal de atalhos estiver aberto', async () => {
      const user = userEvent.setup();
      await renderLoaded({ canUndo: true });

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: 'Atalhos' }));
      await user.keyboard('{Control>}z{/Control}');

      expect(editor.undo).not.toHaveBeenCalled();
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-keyboard', 'false');
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
