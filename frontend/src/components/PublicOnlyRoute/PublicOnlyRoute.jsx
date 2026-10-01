import { Navigate } from 'react-router-dom';
import { hasActiveSession } from '../../services/session';

// Nota: espelho do ProtectedRoute — telas de entrada (login/cadastro/esqueci a senha) não fazem sentido com sessão ativa.
// verify-email e reset-password ficam de fora: são abertas por links de e-mail e precisam funcionar sempre.
function PublicOnlyRoute({ children }) {
  if (hasActiveSession()) {
    return <Navigate to="/projetos" replace />;
  }

  return children;
}

export default PublicOnlyRoute;
