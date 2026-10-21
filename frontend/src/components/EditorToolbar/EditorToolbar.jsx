import { useEffect } from 'react';
import { Redo2, Trash2, Undo2 } from 'lucide-react';
import IconButton from '../Button/IconButton';

const TEXT_FIELDS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Enquanto o usuário digita, Ctrl+Z/Ctrl+Y pertencem ao texto do campo, não ao diagrama
function isTyping(target) {
  return TEXT_FIELDS.has(target?.tagName) || Boolean(target?.isContentEditable);
}

// Nota: barra de ações do editor (wireframe 7, "Controle de Diagrama") — desfazer/refazer (RF23) e excluir
// selecionados, com os atalhos de teclado usuais (Ctrl ou ⌘)
function EditorToolbar({ editor }) {
  const { undo, redo, removeSelected, canUndo, canRedo, hasSelection } = editor;

  useEffect(() => {
    function handleKeyDown(event) {
      if (!(event.ctrlKey || event.metaKey) || isTyping(event.target)) return;
      const key = event.key.toLowerCase();

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div role="toolbar" aria-label="Ações do diagrama" className="flex items-center gap-0.5 rounded-[var(--radius-control)] border border-line bg-surface p-0.5">
      <IconButton icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
      <IconButton icon={Redo2} label="Refazer (Ctrl+Y)" onClick={redo} disabled={!canRedo} />
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <IconButton icon={Trash2} label="Excluir selecionados (Delete)" tone="danger" onClick={removeSelected} disabled={!hasSelection} />
    </div>
  );
}

export default EditorToolbar;
