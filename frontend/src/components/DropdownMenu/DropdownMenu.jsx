import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

const ITEM_BASE =
  'flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm transition-colors duration-150 ' +
  'disabled:pointer-events-none disabled:opacity-55';

const ITEM_TONES = {
  neutral: 'text-text-secondary hover:bg-surface hover:text-text-primary',
  danger: 'text-danger hover:bg-danger/10',
};

// Itens de menu ("menuitem"), compartilhados com o menu de clique direito do canvas (ContextMenu)
export function MenuItems({ items, onChoose }) {
  return items.map((item) => {
    const Icon = item.icon;
    return (
      <button
        key={item.label}
        type="button"
        role="menuitem"
        disabled={item.disabled}
        onClick={() => onChoose(item)}
        className={`${ITEM_BASE} ${ITEM_TONES[item.tone ?? 'neutral']}`}
      >
        {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
        <span className="flex-1">{item.label}</span>
        {item.hint && <span className="text-xs text-text-muted">{item.hint}</span>}
      </button>
    );
  });
}

// Nota: menu suspenso acessível (botão com aria-haspopup/aria-expanded, itens "menuitem"). Fecha ao escolher um item,
// com Esc (devolvendo o foco ao botão) ou com clique fora. Usado no menu da conta e nas configurações do editor.
// items: { label, onSelect (dispensável em item desabilitado), icon?, hint? (ex.: atalho ou "Em breve"), disabled?, tone? }
function DropdownMenu({ label, trigger, items, triggerClassName = '', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current.focus();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function choose(item) {
    setOpen(false);
    item.onSelect();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={triggerClassName}
      >
        {typeof trigger === 'function' ? trigger(open) : trigger}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE_OUT_SOFT }}
            className={`absolute top-full z-40 mt-2 w-56 rounded-[var(--radius-card)] border border-line bg-surface-raised p-1.5 shadow-[var(--shadow-raised)] ${
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
            }`}
          >
            <MenuItems items={items} onChoose={choose} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DropdownMenu;
