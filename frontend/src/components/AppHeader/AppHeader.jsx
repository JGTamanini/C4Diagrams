import { useNavigate } from 'react-router-dom';
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
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <Brand className="" />

      <div className="flex items-center gap-3">
        {user?.name && (
          <>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-mono text-sm font-medium text-accent-fg"
            >
              {getInitials(user.name)}
            </span>
            <span className="hidden text-sm text-text-primary sm:inline">{user.name}</span>
          </>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
