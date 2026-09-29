import { useEffect, useId } from 'react';

// Nota: casca comum dos modais — overlay, semântica de diálogo acessível e fechamento com Esc
function Modal({ title, role = 'dialog', onClose, closable = false, children }) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-medium text-text-primary">
            {title}
          </h2>
          {closable && (
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="text-xl leading-none text-text-secondary hover:text-text-primary"
            >
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
