import { useEffect } from 'react';
import { Redo2, Trash2, Undo2 } from 'lucide-react';
import IconButton from '../Button/IconButton';

const TEXT_FIELDS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Enquanto o usuário digita, Ctrl+Z/Ctrl+Y pertencem ao texto do campo, não ao diagrama
function isTyping(target) {
  return TEXT_FIELDS.has(target?.tagName) || Boolean(target?.isContentEditable);
}

// Nota: barra de ações do editor (wireframe 7, "Controle de Diagrama") — desfazer/refazer (RF23) e excluir
// selecionados, com os atalhos de teclado usuais (Ctrl ou ⌘), incluindo Ctrl+S para salvar na hora e Ctrl+C/Ctrl+V. Com um modal aberto, os atalhos ficam desligados:
// o diagrama por trás não pode mudar sem o usuário ver.
function EditorToolbar({ editor, shortcutsEnabled = true }) {
  const { undo, redo, save, copy, paste, hasClipboard, removeSelected, canUndo, canRedo, hasSelection } = editor;

  useEffect(() => {
    if (!shortcutsEnabled) return undefined;

    function handleKeyDown(event) {
      if (!(event.ctrlKey || event.metaKey) || isTyping(event.target)) return;
      const key = event.key.toLowerCase();

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        redo();
      } else if (key === 's') {
        // Sem o preventDefault, o navegador abriria "Salvar página como"
        event.preventDefault();
        save();
      } else if (key === 'c') {
        // Só toma o atalho quando há elementos para copiar: sem seleção, o Ctrl+C do navegador segue normal
        if (copy()) event.preventDefault();
      } else if (key === 'v' && hasClipboard) {
        event.preventDefault();
        paste();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, save, copy, paste, hasClipboard, shortcutsEnabled]);

  // Histórico e exclusão em grupos separados: ações de natureza diferente, sem parecer uma coisa só
  return (
    <div role="toolbar" aria-label="Ações do diagrama" className="flex items-center gap-3">
      <div className="flex items-center gap-0.5 rounded-[var(--radius-control)] border border-line bg-surface p-0.5">
        <IconButton icon={Undo2} label="Desfazer (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
        <IconButton icon={Redo2} label="Refazer (Ctrl+Y)" onClick={redo} disabled={!canRedo} />
      </div>
      <div className="rounded-[var(--radius-control)] border border-line bg-surface p-0.5">
        <IconButton icon={Trash2} label="Excluir selecionados (Delete)" tone="danger" onClick={removeSelected} disabled={!hasSelection} />
      </div>
    </div>
  );
}

export default EditorToolbar;
