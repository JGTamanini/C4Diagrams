import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileBraces,
  ImageDown,
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
import TextModePanel from '../../components/TextModePanel/TextModePanel';
import ExportImageModal from '../../components/ExportImageModal/ExportImageModal';
import { getProject, InvalidProjectIdError } from '../../services/projects';
import { useDiagramEditor } from '../../hooks/useDiagramEditor';
import { useDiagramValidation } from '../../hooks/useDiagramValidation';
import { downloadProjectFile, levelsWithErrors } from '../../services/projectFile';
import { useAiSuggestions } from '../../hooks/useAiSuggestions';
import ValidationPanel from '../../components/ValidationPanel/ValidationPanel';
import DiagramLegend from '../../components/DiagramLegend/DiagramLegend';
import { LEVELS } from '../../constants/c4Notation';
import { INNER_TYPES, SCOPE_TYPE_LABEL, detailLevelOf, isInnerType, resolveScope } from '../../constants/levelScope';
import ScopePicker from '../../components/ScopePicker/ScopePicker';

const SAVE_STATUS_TEXT = {
  saved: 'Todas as alterações salvas',
  pending: 'Alterações não salvas',
  saving: 'Salvando…',
  error: 'Falha ao salvar. Suas alterações continuam aqui — use "Tentar de novo" ou Ctrl+S.',
  conflict: 'Um nível foi alterado em outra aba ou dispositivo. Escolha, no aviso, qual versão manter.',
};

// Texto curto visível ao lado do ícone, nos estados que pedem atenção
const SAVE_STATUS_SHORT = { pending: 'Não salvo', error: 'Falha ao salvar', conflict: 'Conflito' };
const SAVE_STATUS_COLOR = {
  saved: 'text-text-muted',
  saving: 'text-text-muted',
  pending: 'text-highlight-text',
  error: 'text-danger',
  conflict: 'text-danger',
};

// "Não salvo" fica só no texto curto; o "salvo" é um check verde, para ser percebido de relance
const SAVE_STATUS_ICON = { saved: Check, pending: null, saving: LoaderCircle, error: AlertCircle, conflict: AlertCircle };
const SAVE_STATUS_ICON_COLOR = { saved: 'text-success', saving: 'animate-spin' };

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
        {Icon && <Icon aria-hidden="true" className={`h-4 w-4 ${SAVE_STATUS_ICON_COLOR[status] ?? ''}`} />}
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

const LEVEL_LABELS = Object.fromEntries(LEVELS.map((level) => [level.id, level.label]));

// Nota: issue #74 — outra aba (ou outro dispositivo) gravou o nível depois da versão que esta aba conhece. O nível
// para de ser salvo até o usuário escolher: carregar a versão salva (descarta o que mudou aqui nesse nível) ou manter a
// sua (grava por cima, de propósito). Não some sozinho, ao contrário do aviso comum: a escolha é necessária.
function ConflictNotice({ levels, onResolve }) {
  return (
    <motion.div
      role="alert"
      aria-label="Conflito ao salvar"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: EASE_OUT_SOFT }}
      className="absolute bottom-28 left-1/2 z-30 flex w-max max-w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 flex-col gap-2 rounded-[var(--radius-control)] border border-danger/50 bg-surface-raised p-3 text-sm text-text-primary shadow-[var(--shadow-raised)]"
    >
      {levels.map((level) => (
        <div key={level} className="flex flex-col gap-2">
          <p className="flex items-start gap-2">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <span>
              O nível {LEVEL_LABELS[level]} foi alterado em outra aba ou dispositivo, e o que mudou aqui nesse nível ainda
              não foi salvo. Qual versão manter?
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => onResolve(level, 'saved')}>
              Carregar a versão salva
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onResolve(level, 'mine')}>
              Manter a minha
            </Button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// Nota: abas de nível flutuando no topo do canvas, fixas no centro do editor (não acompanham a paleta nem o
// assistente, para não "dançarem" ao abrir e fechar os painéis); o destaque do nível ativo desliza entre as abas
function LevelTabs({ activeLevel, onSelect }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
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
    </div>
  );
}

function EditorBody({
  editor,
  onEdit,
  keyboardEnabled,
  paletteOpen,
  onTogglePalette,
  issues,
  focusRequest,
  onSelectTreeElement,
  onOpenShortcuts,
  onOpenText,
  exporterRef,
  scopeLabels,
  boundary,
}) {
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
      issues={issues}
      focusRequest={focusRequest}
      nodesByLevel={editor.nodesByLevel}
      scopeLabels={scopeLabels}
      boundary={boundary}
      onOpenShortcuts={onOpenShortcuts}
      onOpenText={onOpenText}
      exporterRef={exporterRef}
      onSelectTreeElement={onSelectTreeElement}
      onNodesChange={editor.onNodesChange}
      onEdgesChange={editor.onEdgesChange}
      onConnect={editor.connect}
      onAddNode={editor.addNode}
      onEditNode={(id) => onEdit({ kind: 'node', id })}
      onEditEdge={(id) => onEdit({ kind: 'edge', id })}
    />
  );
}

// RF22: o foco de cada nível de detalhe (o que ele detalha do nível de cima)
function scopesOf(editor) {
  return {
    container: resolveScope('container', editor.nodesByLevel, editor.scopeByLevel),
    component: resolveScope('component', editor.nodesByLevel, editor.scopeByLevel),
  };
}

const levelName = (levelId) => LEVELS.find((level) => level.id === levelId).label;

// RF22: as relações do elemento no nível aberto, para o modal
function relationsOf(editor, nodeId) {
  const labels = new Map(editor.nodes.map((node) => [node.id, node.data.label]));
  return editor.edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => {
      const outgoing = edge.source === nodeId;
      return {
        id: edge.id,
        direction: outgoing ? 'out' : 'in',
        otherLabel: labels.get(outgoing ? edge.target : edge.source),
        label: edge.label,
        technology: edge.data?.technology ?? '',
      };
    });
}

// RF22: de que elemento do nível de cima o elemento faz parte, e em qual nível ele é detalhado
function levelInfoOf(editor, node) {
  const scopes = scopesOf(editor);
  const focus = scopes[editor.activeLevel]?.focus;
  const partOf =
    focus && isInnerType(editor.activeLevel, node.type)
      ? { label: focus.data.label, type: SCOPE_TYPE_LABEL[editor.activeLevel] }
      : null;

  const childLevel = detailLevelOf(editor.activeLevel, node.type);
  const detail = childLevel && {
    level: childLevel,
    levelName: levelName(childLevel),
    count: editor.nodesByLevel[childLevel].filter((child) => isInnerType(childLevel, child.type)).length,
    isFocus: scopes[childLevel].focus?.id === node.id,
  };
  return { partOf, detail };
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

  function handleSave(values, relationChanges) {
    if (isNode) editor.updateNode(editing.id, values, relationChanges);
    else editor.updateEdge(editing.id, values);
    onClose();
  }

  const node = isNode && target ? editor.nodes.find((candidate) => candidate.id === editing.id) : null;
  const levelInfo = node ? levelInfoOf(editor, node) : null;

  // "Detalhar" escolhe este elemento como foco do nível de baixo (se ainda não for) e abre esse nível
  function handleDetail() {
    const { detail } = levelInfo;
    if (!detail.isFocus) editor.setScope(detail.level, editing.id);
    editor.selectLevel(detail.level);
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
          relations={node ? relationsOf(editor, editing.id) : undefined}
          levelInfo={levelInfo}
          onDetail={handleDetail}
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
  const openShortcuts = useCallback(() => setShowingShortcuts(true), []);
  // RF19: painel do modo textual (sobre a coluna da direita), aberto pela barra de controles do canvas
  const [textMode, setTextMode] = useState(false);
  const openText = useCallback(() => setTextMode(true), []);

  // RF18: exportar a imagem do nível aberto (o canvas preenche o exportador)
  const [showingExport, setShowingExport] = useState(false);
  const closeExport = useCallback(() => setShowingExport(false), []);
  const exporterRef = useRef(null);
  const activeLevelLabel = LEVELS.find((level) => level.id === editor.activeLevel).label;
  const [paletteOpen, setPaletteOpen] = useState(true);
  // RF17: valida o nível aberto pouco depois de cada mudança e mostra o resultado no painel Assistente (à direita)
  // O foco escolhido para o nível vai junto (RF22): sem ele, as regras entre níveis continuariam pedindo a escolha, e
  // a IA não saberia o que o nível detalha
  const activeScopeChoice = editor.scopeByLevel[editor.activeLevel] ?? null;
  const validation = useDiagramValidation(id, editor.activeLevel, editor.nodes, editor.edges, activeScopeChoice);
  // RF16: sugestões da IA sob pedido, na aba Sugestões do mesmo painel
  const ai = useAiSuggestions(id, editor.activeLevel, editor.nodes, editor.edges, activeScopeChoice);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const toggleAssistant = useCallback(() => setAssistantOpen((open) => !open), []);
  const [focusRequest, setFocusRequest] = useState(null);
  // RF22: o que o nível aberto detalha do nível de cima, e a fronteira tracejada em volta dos elementos de dentro
  const scopes = scopesOf(editor);
  const activeScope = scopes[editor.activeLevel] ?? null;
  const boundary = activeScope?.focus
    ? { label: activeScope.focus.data.label, type: SCOPE_TYPE_LABEL[editor.activeLevel], innerTypes: INNER_TYPES[editor.activeLevel] }
    : null;

  // Clicar num problema: seleciona o alvo e pede ao canvas para centralizá-lo (o objeto novo dispara o foco mesmo
  // quando o mesmo problema é clicado de novo)
  function selectIssue({ nodeId, edgeId }) {
    editor.selectOnly({ nodeId, edgeId });
    setFocusRequest({ nodeId, edgeId });
  }

  // RF21: exporta como está no editor; se a importação fosse recusar o arquivo, avisa já na exportação
  function exportProject() {
    downloadProjectFile(project, editor.diagramsByLevel);
    const levels = levelsWithErrors(editor.diagramsByLevel);
    if (levels.length > 0) {
      editor.showNotice(
        `Projeto exportado, mas ${levels.join(', ')} ${levels.length === 1 ? 'tem' : 'têm'} erros de validação: a importação vai recusar o arquivo até eles serem corrigidos.`
      );
    }
  }

  // Clique na árvore de elementos: abre o nível do elemento (se for outro), seleciona e centraliza nele
  function selectTreeElement(level, nodeId) {
    if (level !== editor.activeLevel) editor.selectLevel(level);
    editor.selectOnly({ nodeId, level });
    setFocusRequest({ nodeId });
  }
  const togglePalette = useCallback(() => setPaletteOpen((open) => !open), []);
  // Com um modal aberto, atalhos e teclado do canvas ficam desligados (não mexem no diagrama por trás)
  const modalOpen = Boolean(findEditTarget(editor, editing)) || showingShortcuts || showingExport;

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
              {
                label: 'Exportar imagem',
                icon: ImageDown,
                hint: 'PNG ou PDF',
                disabled: !project || editor.loadStatus !== 'ready',
                onSelect: () => setShowingExport(true),
              },
              // RF21: o projeto inteiro (os três níveis, como estão no editor) num arquivo .json. Só depois de os
              // diagramas chegarem: antes disso (ou se a carga falhar), o arquivo sairia sem eles
              {
                label: 'Exportar projeto',
                icon: FileBraces,
                hint: '.json',
                disabled: !project || editor.loadStatus !== 'ready',
                onSelect: exportProject,
              },
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
          issues={validation.issues}
          focusRequest={focusRequest}
          onSelectTreeElement={selectTreeElement}
          onOpenShortcuts={openShortcuts}
          onOpenText={openText}
          exporterRef={exporterRef}
          scopeLabels={{ container: scopes.container.focus?.data.label ?? null, component: scopes.component.focus?.data.label ?? null }}
          boundary={boundary}
        />
        {textMode && editor.loadStatus === 'ready' && (
          // Trocar de nível gera o texto do novo nível (a chave recria o painel)
          <div className="pointer-events-none absolute top-3 right-3 bottom-3 z-30 flex">
            <TextModePanel
              key={editor.activeLevel}
              level={editor.activeLevel}
              levelLabel={LEVELS.find((level) => level.id === editor.activeLevel).label}
              nodes={editor.nodes}
              edges={editor.edges}
              onApply={editor.applyTextChanges}
              onClose={() => setTextMode(false)}
            />
          </div>
        )}
        <LevelTabs activeLevel={editor.activeLevel} onSelect={editor.selectLevel} />
        {/* Com um candidato só, ele é o foco e não há o que escolher; mas, se o foco escolhido foi apagado, é aqui que se corrige */}
        {editor.loadStatus === 'ready' && activeScope && (activeScope.candidates.length > 1 || (activeScope.status === 'missing' && activeScope.candidates.length > 0)) && (
          <ScopePicker scope={activeScope} onChange={(nodeId) => editor.setScope(editor.activeLevel, nodeId)} />
        )}
        {editor.loadStatus === 'ready' && (
          // Coluna da direita: o assistente em cima e a legenda no canto de baixo. Se o assistente crescer até a legenda,
          // é ele que encolhe e rola por dentro; a legenda não se mexe. A coluna deixa passar os cliques para o canvas:
          // só o painel (ou o botão) e a legenda recebem clique
          <div className="pointer-events-none absolute top-3 right-3 bottom-3 z-20 flex flex-col items-end gap-3">
            <div className="pointer-events-none flex min-h-0 flex-col items-end">
              <ValidationPanel
                open={assistantOpen}
                status={validation.status}
                issues={validation.issues}
                onToggle={toggleAssistant}
                onSelectIssue={selectIssue}
                ai={ai}
                nodes={editor.nodes}
                edges={editor.edges}
                projectDescription={project?.description}
              />
            </div>
            <div className="pointer-events-none mt-auto shrink-0">
              <DiagramLegend nodes={editor.nodes} edges={editor.edges} />
            </div>
          </div>
        )}
        <AnimatePresence>
          {editor.notice && <EditorNotice key={editor.notice} message={editor.notice} onDismiss={editor.dismissNotice} />}
        </AnimatePresence>
        <AnimatePresence>
          {editor.conflictLevels.length > 0 && (
            <ConflictNotice key="conflict" levels={editor.conflictLevels} onResolve={editor.resolveConflict} />
          )}
        </AnimatePresence>
      </main>

      <ElementEditor editor={editor} editing={editing} onClose={closeEditor} />

      <AnimatePresence>{showingShortcuts && <ShortcutsModal key="shortcuts" onClose={closeShortcuts} />}</AnimatePresence>
      <AnimatePresence>
        {showingExport && (
          <ExportImageModal
            key="export-image"
            levelLabel={activeLevelLabel}
            onExport={(options) => exporterRef.current({ ...options, projectName: project.name, levelLabel: activeLevelLabel })}
            onClose={closeExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProjectPage;
