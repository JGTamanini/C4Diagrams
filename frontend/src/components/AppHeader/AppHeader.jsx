import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { ChevronDown, LogOut, UserX } from 'lucide-react';
import Button from '../Button/Button';
import Brand from '../Brand/Brand';
import DropdownMenu from '../DropdownMenu/DropdownMenu';
import DeleteAccountModal from '../DeleteAccountModal/DeleteAccountModal';
import { getUser, clearSession } from '../../services/session';

function getInitials(name) {
  const words = name.trim().split(/\s+/);
  const first = words[0][0];
  const last = words.length > 1 ? words.at(-1)[0] : '';
  return `${first}${last}`.toUpperCase();
}

// Nota: menu da conta, aberto pelo nome do usuário (comportamento de abrir/fechar no DropdownMenu)
function AccountMenu({ name, onDeleteAccount, onLogout }) {
  return (
    <DropdownMenu
      label={`Conta de ${name}`}
      triggerClassName="flex select-none items-center gap-3 rounded-[var(--radius-control)] py-1 pr-2 pl-1 transition-colors duration-150 hover:bg-surface-raised"
      trigger={(open) => (
        <>
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
        </>
      )}
      items={[
        { label: 'Excluir conta', icon: UserX, tone: 'danger', onSelect: onDeleteAccount },
        { label: 'Sair', icon: LogOut, onSelect: onLogout },
      ]}
    />
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
