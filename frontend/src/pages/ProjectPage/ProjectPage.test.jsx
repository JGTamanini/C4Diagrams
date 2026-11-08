import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectPage from './ProjectPage';
import { getProject, InvalidProjectIdError } from '../../services/projects';
import { useDiagramEditor } from '../../hooks/useDiagramEditor';
import { useDiagramValidation } from '../../hooks/useDiagramValidation';
import { downloadProjectFile, levelsWithErrors } from '../../services/projectFile';
import { useAiSuggestions } from '../../hooks/useAiSuggestions';

vi.mock('../../services/projects');
vi.mock('../../hooks/useDiagramEditor');
vi.mock('../../hooks/useDiagramValidation');
const mockExporter = vi.fn();
vi.mock('../../services/projectFile');
vi.mock('../../hooks/useAiSuggestions');
vi.mock('../../components/DiagramCanvas/DiagramCanvas', () => ({
  default: function MockCanvas({
    level,
    nodes,
    keyboardEnabled,
    paletteOpen,
    canPaste,
    issues,
    focusRequest,
    nodesByLevel,
    exporterRef,
    scopeLabels,
    boundary,
    onOpenShortcuts,
    onSelectTreeElement,
    onTogglePalette,
    onAddNode,
    onConnect,
    onEditNode,
    onEditEdge,
    onCopyNodes,
    onPaste,
    onRemoveNode,
    onRemoveSelected,
  }) {
    if (exporterRef) exporterRef.current = mockExporter;
    return (
    <div
      data-testid="canvas"
      data-count={nodes.length}
      data-level={level}
      data-keyboard={String(keyboardEnabled)}
      data-palette={String(paletteOpen)}
      data-can-paste={String(canPaste)}
      data-issues={issues.length}
      data-focus={focusRequest ? JSON.stringify({ nodeId: focusRequest.nodeId, edgeId: focusRequest.edgeId }) : ''}
      data-tree-levels={Object.keys(nodesByLevel).join(',')}
      data-scope-labels={JSON.stringify(scopeLabels)}
      data-boundary={boundary ? `${boundary.label} [${boundary.type}] ${boundary.innerTypes.join(',')}` : ''}
    >
      <button type="button" onClick={onOpenShortcuts}>mock-shortcuts</button>
      <button type="button" onClick={() => onSelectTreeElement('container', 'c1')}>mock-tree-container</button>
      <button type="button" onClick={() => onSelectTreeElement('context', 'n2')}>mock-tree-context</button>
      <button type="button" onClick={() => onCopyNodes(['n1'])}>mock-copy</button>
      <button type="button" onClick={() => onPaste({ x: 1, y: 2 })}>mock-paste</button>
      <button type="button" onClick={() => onRemoveNode('n1')}>mock-remove-node</button>
      <button type="button" onClick={onRemoveSelected}>mock-remove-selected</button>
      <button type="button" onClick={onTogglePalette}>mock-toggle-palette</button>
      <button type="button" onClick={() => onAddNode('c4-system', { x: 1, y: 2 })}>mock-add</button>
      <button type="button" onClick={() => onConnect({ source: 'n1', target: 'n2' })}>mock-connect</button>
      <button type="button" onClick={() => onEditNode('n1')}>mock-edit-node</button>
      <button type="button" onClick={() => onEditNode('n2')}>mock-edit-system</button>
      <button type="button" onClick={() => onEditEdge('e1')}>mock-edit-edge</button>
    </div>
    );
  },
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
  copy: vi.fn(() => true),
  nodesByLevel: { context: [], container: [], component: [] },
  scopeByLevel: { context: null, container: null, component: null },
  setScope: vi.fn(),
  showNotice: vi.fn(),
  diagramsByLevel: { context: { nodes: [], edges: [] }, container: { nodes: [], edges: [] }, component: { nodes: [], edges: [] } },
  selectOnly: vi.fn(),
  paste: vi.fn(),
  hasClipboard: false,
  notice: null,
  dismissNotice: vi.fn(),
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

const validationIssues = [
  { code: 'ISOLATED_ELEMENT', severity: 'warning', nodeId: 'n2', message: '"Loja" não tem nenhuma relação.' },
  { code: 'DUPLICATE_RELATIONSHIP', severity: 'error', edgeId: 'e1', message: 'Relação repetida.' },
];

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
    useDiagramValidation.mockReturnValue({ status: 'ready', issues: validationIssues });
    levelsWithErrors.mockReturnValue([]);
    useAiSuggestions.mockReturnValue({
      mode: 'demo',
      limits: { suggestion: 20, deep: 3 },
      remaining: { suggestion: 20, deep: 3 },
      loading: null,
      busy: false,
      error: null,
      result: null,
      generate: vi.fn(),
      cancel: vi.fn(),
      dismiss: vi.fn(),
    });
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

      const tabs = within(screen.getByRole('tablist', { name: 'Níveis do modelo C4' })).getAllByRole('tab');
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

    it('deve manter as abas fixas no centro do editor, sem acompanhar a paleta nem o assistente', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const tabsWrapper = screen.getByRole('tablist', { name: 'Níveis do modelo C4' }).parentElement;
      const position = tabsWrapper.getAttribute('style');
      expect(tabsWrapper).toHaveClass('inset-x-0');

      await user.click(screen.getByRole('button', { name: 'mock-toggle-palette' }));
      await user.click(screen.getByRole('button', { name: 'Ocultar assistente' }));

      expect(screen.getByTestId('canvas')).toHaveAttribute('data-palette', 'false');
      expect(tabsWrapper.getAttribute('style')).toBe(position);
      expect(tabsWrapper).toHaveClass('inset-x-0');
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

      expect(editor.updateNode).toHaveBeenCalledWith('n1', { label: 'Cliente VIP', description: '' }, { updated: [], removed: [] });
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
      ['{Control>}c{/Control}', 'copy'],
      ['{Meta>}s{/Meta}', 'save'],
    ])('deve aceitar o atalho %s', async (keys, action) => {
      const user = userEvent.setup();
      await renderLoaded({ canUndo: true, canRedo: true });

      await user.keyboard(keys);

      expect(editor[action]).toHaveBeenCalledTimes(1);
    });

    it('deve ligar o menu de clique direito do canvas a copiar, colar e excluir do editor', async () => {
      const user = userEvent.setup();
      await renderLoaded({ hasClipboard: true });
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-can-paste', 'true');

      await user.click(screen.getByRole('button', { name: 'mock-copy' }));
      await user.click(screen.getByRole('button', { name: 'mock-paste' }));
      await user.click(screen.getByRole('button', { name: 'mock-remove-node' }));
      await user.click(screen.getByRole('button', { name: 'mock-remove-selected' }));

      expect(editor.copy).toHaveBeenCalledWith(['n1']);
      expect(editor.paste).toHaveBeenCalledWith({ x: 1, y: 2 });
      expect(editor.removeNode).toHaveBeenCalledWith('n1');
      expect(editor.removeSelected).toHaveBeenCalledTimes(1);
    });

    it('deve colar com Ctrl+V só quando houver algo copiado', async () => {
      const user = userEvent.setup();
      await renderLoaded({ hasClipboard: false });
      await user.keyboard('{Control>}v{/Control}');
      expect(editor.paste).not.toHaveBeenCalled();
    });

    it('deve colar com Ctrl+V quando houver algo copiado', async () => {
      const user = userEvent.setup();
      await renderLoaded({ hasClipboard: true });

      await user.keyboard('{Control>}v{/Control}');

      expect(editor.paste).toHaveBeenCalledTimes(1);
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

    it('deve mostrar o aviso do editor (ex.: limite de elementos) e permitir fechá-lo', async () => {
      const user = userEvent.setup();
      await renderLoaded({ notice: 'O diagrama pode ter no máximo 200 elementos.' });

      expect(screen.getByRole('status', { name: 'Aviso do editor' })).toHaveTextContent('O diagrama pode ter no máximo 200 elementos.');
      await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));

      expect(editor.dismissNotice).toHaveBeenCalledTimes(1);
    });

    it('deve fechar o aviso sozinho depois de alguns segundos', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        await renderLoaded({ notice: 'O diagrama pode ter no máximo 200 elementos.' });

        expect(editor.dismissNotice).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(6000);

        expect(editor.dismissNotice).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('deve mostrar "Não salvo" só em texto, sem ícone, enquanto houver alteração pendente', async () => {
      await renderLoaded({ saveStatus: 'pending' });

      const status = screen.getByTestId('save-status');
      expect(within(status).getByText('Não salvo')).toBeInTheDocument();
      expect(status.querySelector('svg')).toBeNull();
    });

    it('deve mostrar o "salvo" com o ícone em verde, para ser percebido de relance', async () => {
      await renderLoaded({ saveStatus: 'saved' });

      expect(screen.getByTestId('save-status').querySelector('svg')).toHaveClass('text-success');
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

    it('deve oferecer no menu de configurações Salvar, Exportar imagem, Exportar projeto e Atalhos', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      const items = within(screen.getByRole('menu')).getAllByRole('menuitem');

      expect(items.map((item) => item.textContent)).toEqual(['SalvarCtrl+S', 'Exportar imagemPNG ou PDF', 'Exportar projeto.json', 'Atalhos']);
    });

    it('deve baixar o projeto inteiro (os três níveis, como estão no editor) pelo menu (RF21)', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: /Exportar projeto/ }));

      expect(downloadProjectFile).toHaveBeenCalledWith({ id: 'p1', name: 'Loja Online', description: null }, editor.diagramsByLevel);
    });

    // Os diagramas chegam numa requisição separada: antes de chegarem (ou se falharem), o arquivo sairia vazio
    it.each(['loading', 'error'])('deve desabilitar Exportar projeto enquanto os diagramas estão %s', async (loadStatus) => {
      const user = userEvent.setup();
      await renderLoaded({ loadStatus });

      await user.click(screen.getByRole('button', { name: 'Configurações' }));

      expect(screen.getByRole('menuitem', { name: /Exportar projeto/ })).toBeDisabled();
    });

    it('deve avisar ao exportar um projeto com erros, que a importação recusaria', async () => {
      const user = userEvent.setup();
      levelsWithErrors.mockReturnValue(['Contexto', 'Container']);
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: /Exportar projeto/ }));

      expect(downloadProjectFile).toHaveBeenCalled();
      expect(editor.showNotice).toHaveBeenCalledWith(
        'Projeto exportado, mas Contexto, Container têm erros de validação: a importação vai recusar o arquivo até eles serem corrigidos.'
      );
    });

    it('não deve avisar nada ao exportar um projeto sem erros', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: /Exportar projeto/ }));

      expect(editor.showNotice).not.toHaveBeenCalled();
    });

    it('deve mostrar os atalhos do editor num modal, incluindo a seleção múltipla', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: 'Atalhos' }));
      const dialog = screen.getByRole('dialog', { name: 'Atalhos do editor' });

      for (const text of [
        'Desfazer',
        'Refazer',
        'Salvar',
        'Copiar selecionados',
        'Colar',
        'Excluir selecionados',
        'Menu de ações',
        'Selecionar vários (caixa)',
        'Somar à seleção',
      ]) {
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

  describe('validação do diagrama (RF17)', () => {
    it('deve validar o nível aberto e mostrar o resultado no assistente', async () => {
      await renderLoaded();

      expect(useDiagramValidation).toHaveBeenCalledWith('p1', 'context', editor.nodes, editor.edges, null);
      const panel = screen.getByRole('complementary', { name: 'Assistente' });
      expect(within(panel).getByRole('region', { name: 'Erros (1)' })).toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-issues', '2');
    });

    it('deve mostrar a legenda na coluna do assistente, no canto de baixo (o assistente encolhe e rola se chegar até ela)', async () => {
      await renderLoaded();

      const panelBox = screen.getByRole('complementary', { name: 'Assistente' }).parentElement;
      const legend = screen.getByRole('region', { name: 'Legenda' });
      expect(panelBox.parentElement).toContainElement(legend);
      expect(panelBox).toHaveClass('min-h-0');
      expect(legend.parentElement).toHaveClass('mt-auto', 'shrink-0');
    });

    it('deve abrir os atalhos pela barra de controles do canvas', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'mock-shortcuts' }));

      expect(screen.getByRole('dialog', { name: 'Atalhos do editor' })).toBeInTheDocument();
    });

    it('não deve bloquear os cliques no canvas abaixo do assistente', async () => {
      await renderLoaded();

      expect(screen.getByRole('complementary', { name: 'Assistente' }).parentElement).toHaveClass('pointer-events-none');
    });

    it('deve selecionar e centralizar o elemento do problema clicado', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: '"Loja" não tem nenhuma relação.' }));

      expect(editor.selectOnly).toHaveBeenCalledWith({ nodeId: 'n2', edgeId: undefined });
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-focus', JSON.stringify({ nodeId: 'n2' }));
    });

    it('deve ocultar o assistente, mantendo a legenda no canto', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      await user.click(screen.getByRole('button', { name: 'Ocultar assistente' }));

      expect(screen.queryByRole('complementary', { name: 'Assistente' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mostrar assistente (1 erro, 1 aviso)' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Legenda' })).toBeInTheDocument();
    });
  });

  describe('árvore dos elementos', () => {
    it('deve passar os elementos de todos os níveis para a árvore', async () => {
      await renderLoaded();

      expect(screen.getByTestId('canvas')).toHaveAttribute('data-tree-levels', 'context,container,component');
    });

    it('deve trocar de nível, selecionar e centralizar o elemento clicado em outro nível', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'mock-tree-container' }));

      expect(editor.selectLevel).toHaveBeenCalledWith('container');
      expect(editor.selectOnly).toHaveBeenCalledWith({ nodeId: 'c1', level: 'container' });
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-focus', JSON.stringify({ nodeId: 'c1' }));
    });

    it('não deve trocar de nível quando o elemento clicado já está no nível aberto', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'mock-tree-context' }));

      expect(editor.selectLevel).not.toHaveBeenCalled();
      expect(editor.selectOnly).toHaveBeenCalledWith({ nodeId: 'n2', level: 'context' });
    });
  });

  describe('exportar imagem (RF18)', () => {
    it('deve exportar o nível aberto com as opções do modal e o nome do projeto', async () => {
      const user = userEvent.setup();
      mockExporter.mockResolvedValue(undefined);
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: /Exportar imagem/ }));
      const dialog = screen.getByRole('dialog', { name: 'Exportar imagem do nível Contexto' });
      await user.click(within(dialog).getByRole('button', { name: 'Exportar' }));

      expect(mockExporter).toHaveBeenCalledWith({
        format: 'png',
        area: 'content',
        background: 'light',
        projectName: 'Loja Online',
        levelLabel: 'Contexto',
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('deve desligar os atalhos do editor com o modal de exportação aberto', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Configurações' }));
      await user.click(screen.getByRole('menuitem', { name: /Exportar imagem/ }));

      expect(screen.getByTestId('canvas')).toHaveAttribute('data-keyboard', 'false');
    });
  });

  describe('ligação entre níveis (RF22)', () => {
    const contextNodes = [
      { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
      { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja' } },
    ];
    const containerNodes = [
      { id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API' } },
      { id: 'c2', type: 'c4-container', position: { x: 0, y: 200 }, data: { label: 'Web' } },
    ];
    const nodesByLevel = { context: contextNodes, container: containerNodes, component: [] };

    it('deve desenhar no canvas a fronteira do elemento que o nível detalha e mostrar o foco na árvore', async () => {
      await renderLoaded({ activeLevel: 'container', nodes: containerNodes, edges: [], nodesByLevel });

      const canvas = screen.getByTestId('canvas');
      expect(canvas).toHaveAttribute('data-boundary', 'Loja [Software System] c4-container,c4-container-db');
      expect(JSON.parse(canvas.dataset.scopeLabels)).toEqual({ container: 'Loja', component: null });
    });

    it('deve pedir qual elemento o nível detalha quando há mais de um candidato, e guardar a escolha', async () => {
      const user = userEvent.setup();
      await renderLoaded({ activeLevel: 'component', nodes: [], edges: [], nodesByLevel });

      const picker = screen.getByLabelText('Elemento que este nível detalha');
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-boundary', '');
      await user.selectOptions(picker, 'c2');

      expect(editor.setScope).toHaveBeenCalledWith('component', 'c2');
    });

    it('não deve mostrar a escolha quando só há um candidato (ele é o foco)', async () => {
      await renderLoaded({ activeLevel: 'container', nodes: containerNodes, edges: [], nodesByLevel });

      expect(screen.queryByLabelText('Elemento que este nível detalha')).not.toBeInTheDocument();
    });

    it('deve mostrar a escolha quando o foco se perdeu, mesmo com um candidato só, para o usuário corrigir ali', async () => {
      const user = userEvent.setup();
      await renderLoaded({
        activeLevel: 'container',
        nodes: containerNodes,
        edges: [],
        nodesByLevel,
        scopeByLevel: { context: null, container: { nodeId: 'apagado' }, component: null },
      });

      const picker = screen.getByLabelText('Elemento que este nível detalha');
      expect(screen.getByTestId('canvas')).toHaveAttribute('data-boundary', '');
      await user.selectOptions(picker, 'n2');

      expect(editor.setScope).toHaveBeenCalledWith('container', 'n2');
    });

    it('não deve mostrar a escolha quando o foco se perdeu e não há candidato', async () => {
      await renderLoaded({
        activeLevel: 'container',
        nodes: containerNodes,
        edges: [],
        nodesByLevel: { ...nodesByLevel, context: [contextNodes[0]] },
        scopeByLevel: { context: null, container: { nodeId: 'apagado' }, component: null },
      });

      expect(screen.queryByLabelText('Elemento que este nível detalha')).not.toBeInTheDocument();
    });

    it('deve validar o nível aberto com o foco escolhido para ele', async () => {
      await renderLoaded({
        activeLevel: 'container',
        nodes: containerNodes,
        edges: [],
        nodesByLevel,
        scopeByLevel: { context: null, container: { nodeId: 'n2' }, component: null },
      });

      expect(useDiagramValidation).toHaveBeenCalledWith('p1', 'container', containerNodes, [], { nodeId: 'n2' });
    });

    it('deve mostrar no modal as relações do elemento', async () => {
      const user = userEvent.setup();
      await renderLoaded({ nodes: contextNodes, nodesByLevel });

      await user.click(screen.getByRole('button', { name: 'mock-edit-node' }));

      expect(screen.getByRole('heading', { name: 'Relações (1)' })).toBeInTheDocument();
      expect(screen.getByLabelText('Rótulo da relação com Loja')).toHaveValue('Usa');
    });

    it('deve detalhar o sistema no nível Container a partir do modal', async () => {
      const user = userEvent.setup();
      const withTwoSystems = [...contextNodes, { ...contextNodes[1], id: 'n3', data: { label: 'ERP' } }];
      await renderLoaded({ nodes: withTwoSystems, nodesByLevel: { ...nodesByLevel, context: withTwoSystems } });

      await user.click(screen.getByRole('button', { name: 'mock-edit-system' }));
      await user.click(screen.getByRole('button', { name: 'Detalhar no nível Container' }));

      expect(editor.setScope).toHaveBeenCalledWith('container', 'n2');
      expect(editor.selectLevel).toHaveBeenCalledWith('container');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
  });

  describe('sugestões da IA (RF16)', () => {
    it('deve ligar as sugestões ao nível aberto, na aba Sugestões do assistente', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      expect(useAiSuggestions).toHaveBeenCalledWith('p1', 'context', editor.nodes, editor.edges, null);
      await user.click(screen.getByRole('tab', { name: 'Sugestões' }));

      expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sugerir melhorias' })).toBeInTheDocument();
    });
  });
});
