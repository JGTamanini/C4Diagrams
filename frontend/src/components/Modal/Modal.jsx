import { useEffect, useId, useRef } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import IconButton from '../Button/IconButton';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

const SIZES = { md: 'max-w-lg', lg: 'max-w-4xl' };

// Nota: casca comum dos modais — overlay, semântica de diálogo acessível e fechamento com Esc ou clicando fora (no
// fundo escurecido), que equivalem a "Cancelar". Com busy (algo sendo salvo), nenhum dos dois fecha.
// Entra com fade + leve escala; a saída animada depende de um <AnimatePresence> em volta, em quem o renderiza.
function Modal({ title, role = 'dialog', onClose, closable = false, busy = false, size = 'md', children }) {
  const titleId = useId();
  // O clique só fecha se também começou no fundo: selecionar o texto de um campo e soltar fora não fecha
  const pressedBackdropRef = useRef(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, busy]);

  function handleBackdropMouseDown(event) {
    pressedBackdropRef.current = event.target === event.currentTarget;
  }

  function handleBackdropClick(event) {
    const outside = pressedBackdropRef.current && event.target === event.currentTarget;
    pressedBackdropRef.current = false;
    if (outside && !busy) onClose();
  }

  return (
    // O fundo só responde ao mouse; pelo teclado, o Esc faz o mesmo papel
    <motion.div
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${SIZES[size]} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[var(--radius-card)] border border-[#33415c] bg-surface-raised p-6 shadow-[0_1px_0_0_rgb(255_255_255/0.06)_inset,0_24px_60px_-12px_rgb(0_0_0/0.8)]`}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.22, ease: EASE_OUT_SOFT }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          {/* Título longo (ex.: nome de projeto sem espaços) é cortado com reticências; o completo fica no title */}
          <h2
            id={titleId}
            title={typeof title === 'string' ? title : undefined}
            className="min-w-0 truncate text-xl font-semibold text-text-primary"
          >
            {title}
          </h2>
          {closable && <IconButton icon={X} label="Fechar" onClick={onClose} className="-mr-2 -mt-1" />}
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default Modal;
