import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Button from '../Button/Button';
import Brand from '../Brand/Brand';
import { getUser, clearSession } from '../../services/session';

function getInitials(name) {
  const words = name.trim().split(/\s+/);
  const first = words[0][0];
  const last = words.length > 1 ? words.at(-1)[0] : '';
  return `${first}${last}`.toUpperCase();
}

function AppHeader() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    clearSession();
    void navigate('/login', { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <Brand className="" />

      <div className="flex items-center gap-3">
        {user?.name && (
          <>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-linear-to-br from-accent to-highlight font-mono text-sm font-medium text-white"
            >
              {getInitials(user.name)}
            </span>
            <span className="hidden select-none text-sm text-text-primary sm:inline">{user.name}</span>
          </>
        )}
        <Button variant="ghost" size="sm" icon={LogOut} onClick={handleLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
}

export default AppHeader;
