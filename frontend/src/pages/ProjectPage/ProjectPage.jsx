import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleDot,
  Download,
  Keyboard,
  LoaderCircle,
  RotateCw,
  Save,
  Settings,
  TriangleAlert,
  X,
} from 'lucide-react';
import IconButton from '../../components/Button/IconButton';
import Button from '../../components/Button/Button';
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
  error: 'Falha ao salvar. Suas alterações continuam aqui — use "Tentar de novo" ou Ctrl+S.',
};

// Texto curto visível ao lado do ícone, nos estados que pedem atenção
const SAVE_STATUS_SHORT = { pending: 'Não salvo', error: 'Falha ao salvar' };
const SAVE_STATUS_COLOR = { saved: 'text-text-muted', saving: 'text-text-muted', pending: 'text-highlight-text', error: 'text-danger' };

const SAVE_STATUS_ICON = { saved: Check, pending: CircleDot, saving: LoaderCircle, error: AlertCircle };

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Nota: estado do salvamento como ícone discreto na barra; o texto completo fica na dica e para leitores de tela.
// "Não salvo" e "Falha ao salvar" também aparecem em texto curto e cor própria, e a falha traz o "Tentar de novo" ao
// lado — sem precisar lembrar do atalho nem abrir o menu de configurações.
function SaveStatus({ status, onRetry }) {
  const Icon = SAVE_STATUS_ICON[status];
  const text = SAVE_STATUS_TEXT[status];
  const short = SAVE_STATUS_SHORT[status];
  return (
    <div className="flex items-center gap-2">
      <output data-testid="save-status" title={text} className={`flex items-center gap-1.5 text-xs ${SAVE_STATUS_COLOR[status]}`}>
        <Icon aria-hidden="true" className={`h-4 w-4 ${status === 'saving' ? 'animate-spin' : ''}`} />
        {short && <span aria-hidden="true">{short}</span>}
        <span className="sr-only">{text}</span>
      </output>
      {status === 'error' && (
        <Button variant="secondary" size="sm" icon={RotateCw} onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

// Tempo que o aviso do editor fica na tela antes de sumir sozinho
const NOTICE_DURATION_MS = 5000;

// Nota: aviso curto do editor (ex.: colagem bloqueada pelo limite de elementos), acima das dicas do canvas.
// Some sozinho depois de alguns segundos ou pelo botão de fechar.
function EditorNotice({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <motion.div
      role="status"
      aria-label="Aviso do editor"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: EASE_OUT_SOFT }}
      className="absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-[var(--radius-control)] border border-highlight/40 bg-surface-raised py-1.5 pr-1.5 pl-3 text-sm text-text-primary shadow-[var(--shadow-raised)]"
    >
      <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-highlight-text" />
      {message}
      <IconButton icon={X} label="Fechar aviso" onClick={onDismiss} />
    </motion.div>
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
          <SaveStatus status={editor.saveStatus} onRetry={editor.save} />
          <DropdownMenu
            label="Configurações"
            trigger={<Settings aria-hidden="true" className="h-4 w-4" />}
            triggerClassName={iconButtonClasses({ className: 'border border-line bg-surface' })}
            items={[
              { label: 'Salvar', icon: Save, hint: 'Ctrl+S', onSelect: editor.save },
              { label: 'Exportar', icon: Download, hint: 'Em breve', disabled: true },
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
        <AnimatePresence>
          {editor.notice && <EditorNotice key={editor.notice} message={editor.notice} onDismiss={editor.dismissNotice} />}
        </AnimatePresence>
      </main>

      <ElementEditor editor={editor} editing={editing} onClose={closeEditor} />

      <AnimatePresence>{showingShortcuts && <ShortcutsModal key="shortcuts" onClose={closeShortcuts} />}</AnimatePresence>
    </div>
  );
}

export default ProjectPage;
