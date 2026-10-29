import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MenuItems } from '../DropdownMenu/DropdownMenu';

// Nota: menu de clique direito, aberto no ponto do cursor. Fecha ao escolher um item, com Esc ou com clique fora.
function ContextMenu({ label, position, items, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current.contains(event.target)) onClose();
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function choose(item) {
    onClose();
    item.onSelect();
  }

  return (
    <motion.div
      ref={menuRef}
      role="menu"
      aria-label={label}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12 }}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 w-52 origin-top-left rounded-[var(--radius-card)] border border-line bg-surface-raised p-1.5 shadow-[var(--shadow-raised)]"
    >
      <MenuItems items={items} onChoose={choose} />
    </motion.div>
  );
}

export default ContextMenu;
