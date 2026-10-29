import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MenuItems } from '../DropdownMenu/DropdownMenu';

// Distância mínima entre o menu e a borda da tela
const SCREEN_MARGIN = 8;

// Abre no ponto do cursor; se não couber (perto da borda direita ou de baixo), abre para a esquerda ou para cima —
// e nunca começa fora da tela
function fitOnScreen(point, size) {
  const fits = (start, length, limit) => start + length <= limit - SCREEN_MARGIN;
  const x = fits(point.x, size.width, window.innerWidth) ? point.x : point.x - size.width;
  const y = fits(point.y, size.height, window.innerHeight) ? point.y : point.y - size.height;
  return { x: Math.max(SCREEN_MARGIN, x), y: Math.max(SCREEN_MARGIN, y) };
}

// Nota: menu de clique direito, aberto no ponto do cursor. Fecha ao escolher um item, com Esc ou com clique fora.
function ContextMenu({ label, position, items, onClose }) {
  const menuRef = useRef(null);
  const [placement, setPlacement] = useState({ x: position.x, y: position.y });

  // Mede o menu antes de pintar a tela e corrige a posição, sem o menu "pular" à vista do usuário
  useLayoutEffect(() => {
    const { width, height } = menuRef.current.getBoundingClientRect();
    setPlacement(fitOnScreen(position, { width, height }));
  }, [position]);

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
      style={{ left: placement.x, top: placement.y }}
      className="fixed z-50 w-52 origin-top-left rounded-[var(--radius-card)] border border-line bg-surface-raised p-1.5 shadow-[var(--shadow-raised)]"
    >
      <MenuItems items={items} onChoose={choose} />
    </motion.div>
  );
}

export default ContextMenu;
