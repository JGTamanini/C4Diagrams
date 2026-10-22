import { useEffect, useId } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import IconButton from '../Button/IconButton';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

const SIZES = { md: 'max-w-lg', lg: 'max-w-4xl' };

// Nota: casca comum dos modais — overlay, semântica de diálogo acessível e fechamento com Esc.
// Entra com fade + leve escala; a saída animada depende de um <AnimatePresence> em volta, em quem o renderiza.
function Modal({ title, role = 'dialog', onClose, closable = false, size = 'md', children }) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
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
          <h2 id={titleId} className="text-xl font-semibold text-text-primary">
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
