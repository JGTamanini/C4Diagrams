import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, LogOut, UserX } from 'lucide-react';
import Button from '../Button/Button';
import Brand from '../Brand/Brand';
import DeleteAccountModal from '../DeleteAccountModal/DeleteAccountModal';
import { getUser, clearSession } from '../../services/session';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];
const MENU_ITEM =
  'flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm transition-colors duration-150';

function getInitials(name) {
  const words = name.trim().split(/\s+/);
  const first = words[0][0];
  const last = words.length > 1 ? words.at(-1)[0] : '';
  return `${first}${last}`.toUpperCase();
}

// Nota: menu da conta, aberto pelo nome do usuário — fecha com Esc (devolvendo o foco ao botão) ou com clique fora
function AccountMenu({ name, onDeleteAccount, onLogout }) {
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

  function choose(action) {
    setOpen(false);
    action();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Conta de ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex select-none items-center gap-3 rounded-[var(--radius-control)] py-1 pr-2 pl-1 transition-colors duration-150 hover:bg-surface-raised"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-accent to-highlight font-mono text-sm font-medium text-white"
        >
          {getInitials(name)}
        </span>
        <span className="hidden text-sm text-text-primary sm:inline">{name}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Conta"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE_OUT_SOFT }}
            className="absolute top-full right-0 z-30 mt-2 w-52 origin-top-right rounded-[var(--radius-card)] border border-line bg-surface-raised p-1.5 shadow-[var(--shadow-raised)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(onDeleteAccount)}
              className={`${MENU_ITEM} text-danger hover:bg-danger/10`}
            >
              <UserX aria-hidden="true" className="h-4 w-4" />
              Excluir conta
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(onLogout)}
              className={`${MENU_ITEM} text-text-secondary hover:bg-surface hover:text-text-primary`}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppHeader() {
  const navigate = useNavigate();
  const user = getUser();
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Sair e excluir a conta terminam igual: sessão encerrada e volta para a página inicial
  function leave() {
    clearSession();
    void navigate('/', { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <Brand className="" />

      {user?.name ? (
        <AccountMenu name={user.name} onDeleteAccount={() => setDeletingAccount(true)} onLogout={leave} />
      ) : (
        <Button variant="ghost" size="sm" icon={LogOut} onClick={leave}>
          Sair
        </Button>
      )}

      <AnimatePresence>
        {deletingAccount && (
          <DeleteAccountModal key="delete-account" onDeleted={leave} onClose={() => setDeletingAccount(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}

export default AppHeader;
