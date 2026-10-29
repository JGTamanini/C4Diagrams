import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Check, CircleDot, Download, Keyboard, LoaderCircle, Save, Settings } from 'lucide-react';
import AppHeader from '../../components/AppHeader/AppHeader';
import Brand from '../../components/Brand/Brand';
import { buttonClasses, iconButtonClasses } from '../../components/Button/buttonStyles';
import DropdownMenu from '../../components/DropdownMenu/DropdownMenu';
import ShortcutsModal from '../../components/ShortcutsModal/ShortcutsModal';
import DiagramCanvas from '../../components/DiagramCanvas/DiagramCanvas';
import ElementFormModal from '../../components/ElementFormModal/ElementFormModal';
import EditorToolbar from '../../components/EditorToolbar/EditorToolbar';
import { PALETTE_OFFSET } from '../../components/ElementPalette/ElementPalette';
import { getProject, InvalidProjectIdError } from '../../services/projects';
import { useDiagramEditor } from '../../hooks/useDiagramEditor';
import { LEVELS } from '../../constants/c4Notation';

const SAVE_STATUS_TEXT = {
  saved: 'Todas as alterações salvas',
  pending: 'Alterações não salvas',
  saving: 'Salvando…',
  error: 'Falha ao salvar. Suas alterações continuam aqui — use Salvar (Ctrl+S) para tentar de novo.',
};

const SAVE_STATUS_ICON = { saved: Check, pending: CircleDot, saving: LoaderCircle, error: AlertCircle };

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Nota: estado do salvamento como ícone discreto na barra; o texto completo fica na dica e para leitores de tela.
// A falha também aparece em texto, para não passar despercebida.
function SaveStatus({ status }) {
  const Icon = SAVE_STATUS_ICON[status];
  const text = SAVE_STATUS_TEXT[status];
  return (
    <output
      data-testid="save-status"
      title={text}
      className={`flex items-center gap-1.5 text-xs ${status === 'error' ? 'text-danger' : 'text-text-muted'}`}
    >
      <Icon aria-hidden="true" className={`h-4 w-4 ${status === 'saving' ? 'animate-spin' : ''}`} />
      {status === 'error' && <span aria-hidden="true">Falha ao salvar</span>}
      <span className="sr-only">{text}</span>
    </output>
  );
}

// Nota: abas de nível flutuando no topo do canvas, centralizadas na área de trabalho (deslizam junto com a paleta);
// o destaque do nível ativo também desliza entre as abas (layoutId)
function LevelTabs({ activeLevel, onSelect, paletteOpen }) {
  return (
    <motion.div
      data-palette-open={String(paletteOpen)}
      initial={false}
      animate={{ left: paletteOpen ? PALETTE_OFFSET : 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
      className="pointer-events-none absolute top-3 right-0 z-20 flex justify-center"
    >
      <div
        role="tablist"
        aria-label="Níveis do modelo C4"
        className="pointer-events-auto flex gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-[var(--shadow-raised)] backdrop-blur-sm"
      >
        {LEVELS.map((level) => {
          const selected = level.id === activeLevel;
          return (
            <button
              key={level.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(level.id)}
              className={`relative rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${
                selected ? 'text-accent-fg' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="active-level"
                  aria-hidden="true"
                  transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
                  className="absolute inset-0 rounded-full bg-accent"
                />
              )}
              <span className="relative">{level.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function EditorBody({ editor, onEdit, keyboardEnabled, paletteOpen, onTogglePalette }) {
  if (editor.loadStatus === 'loading') {
    return <output className="block p-6 text-sm text-text-secondary">Carregando diagramas...</output>;
  }

  if (editor.loadStatus === 'error') {
    return (
      <p role="alert" className="p-6 text-center text-sm text-danger">
        Não foi possível carregar os diagramas deste projeto. Recarregue a página para tentar novamente.
      </p>
    );
  }

  return (
    <DiagramCanvas
      level={editor.activeLevel}
      nodes={editor.nodes}
      edges={editor.edges}
      keyboardEnabled={keyboardEnabled}
      paletteOpen={paletteOpen}
      onTogglePalette={onTogglePalette}
      canPaste={editor.hasClipboard}
      onCopyNodes={editor.copy}
      onPaste={editor.paste}
      onRemoveNode={editor.removeNode}
      onRemoveSelected={editor.removeSelected}
      onNodesChange={editor.onNodesChange}
      onEdgesChange={editor.onEdgesChange}
      onConnect={editor.connect}
      onAddNode={editor.addNode}
      onEditNode={(id) => onEdit({ kind: 'node', id })}
      onEditEdge={(id) => onEdit({ kind: 'edge', id })}
    />
  );
}

// Nota: o alvo do modal é procurado no nível ativo a cada render — se ele deixar de existir, o modal some
function findEditTarget(editor, editing) {
  if (!editing) return null;
  if (editing.kind === 'node') {
    const node = editor.nodes.find((candidate) => candidate.id === editing.id);
    return node && { kind: 'node', type: node.type, data: node.data };
  }
  const edge = editor.edges.find((candidate) => candidate.id === editing.id);
  return edge && { kind: 'edge', label: edge.label, data: edge.data };
}

function ElementEditor({ editor, editing, onClose }) {
  const target = findEditTarget(editor, editing);
  const isNode = editing?.kind === 'node';

  function handleSave(values) {
    if (isNode) editor.updateNode(editing.id, values);
    else editor.updateEdge(editing.id, values);
    onClose();
  }

  function handleDelete() {
    if (isNode) editor.removeNode(editing.id);
    else editor.removeEdge(editing.id);
    onClose();
  }

  // Nota: AnimatePresence mantém o modal na tela durante a animação de saída
  return (
    <AnimatePresence>
      {target && (
        <ElementFormModal
          key={`${editing.kind}-${editing.id}`}
          target={target}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

// Nota: editor de diagramas do projeto (wireframe 7) — níveis, paleta, conexões, modal de edição (RF22),
// legenda e salvamento automático
function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const editor = useDiagramEditor(id);
  const [editing, setEditing] = useState(null);
  const closeEditor = useCallback(() => setEditing(null), []);
  const [showingShortcuts, setShowingShortcuts] = useState(false);
  const closeShortcuts = useCallback(() => setShowingShortcuts(false), []);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);
  // Com um modal aberto, atalhos e teclado do canvas ficam desligados (não mexem no diagrama por trás)
  const modalOpen = Boolean(findEditTarget(editor, editing)) || showingShortcuts;

  useEffect(() => {
    let active = true;

    getProject(id)
      .then((data) => active && setProject(data))
      .catch((err) => {
        if (!active) return;
        // Nota: id fora do formato é rejeitado antes da requisição e equivale a um 404 para o usuário
        const notFound = err instanceof InvalidProjectIdError || err.response?.status === 404;
        setErrorMessage(notFound ? 'Projeto não encontrado.' : 'Não foi possível carregar o projeto.');
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas font-sans">
        <AppHeader />
        <div className="p-6 text-center">
          <p role="alert" className="mb-4 text-text-secondary">
            {errorMessage}
          </p>
          <Link to="/projetos" className="text-link text-sm">
            Voltar para meus projetos
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas font-sans">
        <AppHeader />
        <output className="block p-6 text-sm text-text-secondary">Carregando projeto...</output>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-canvas font-sans">
      {/* Barra única: voltar | nome do projeto (centralizado) | ações, configurações e marca */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
        <Link to="/projetos" className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'justify-self-start' })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Meus projetos
        </Link>

        {/* Nome longo é cortado (o completo fica no title); o nível ativo aparece nas abas */}
        <h1 title={project.name} className="max-w-[32rem] truncate text-base font-semibold text-text-primary">
          {project.name}
        </h1>

        <div className="flex items-center justify-end gap-3">
          {editor.loadStatus === 'ready' && <EditorToolbar editor={editor} shortcutsEnabled={!modalOpen} />}
          <span aria-hidden="true" className="h-6 w-px bg-line" />
          <SaveStatus status={editor.saveStatus} />
          <DropdownMenu
            label="Configurações"
            trigger={<Settings aria-hidden="true" className="h-4 w-4" />}
            triggerClassName={iconButtonClasses({ className: 'border border-line bg-surface' })}
            items={[
              { label: 'Salvar', icon: Save, hint: 'Ctrl+S', onSelect: editor.save },
              { label: 'Exportar', icon: Download, hint: 'Em breve', disabled: true, onSelect: () => {} },
              { label: 'Atalhos', icon: Keyboard, onSelect: () => setShowingShortcuts(true) },
            ]}
          />
          <Brand className="ml-1" />
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <EditorBody
          editor={editor}
          onEdit={setEditing}
          keyboardEnabled={!modalOpen}
          paletteOpen={paletteOpen}
          onTogglePalette={togglePalette}
        />
        <LevelTabs activeLevel={editor.activeLevel} onSelect={editor.selectLevel} paletteOpen={paletteOpen} />
      </main>

      <ElementEditor editor={editor} editing={editing} onClose={closeEditor} />

      <AnimatePresence>{showingShortcuts && <ShortcutsModal key="shortcuts" onClose={closeShortcuts} />}</AnimatePresence>
    </div>
  );
}

export default ProjectPage;
