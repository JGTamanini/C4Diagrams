import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onUnauthorized } from '../../services/api';
import { getToken, hasActiveSession } from '../../services/session';

// Nota: o login recebe de onde o usuário veio (ex.: um link de visualização) e volta para lá depois de entrar
function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  // Nota: o interceptor do api.js já limpou a sessão; aqui só redirecionamos avisando o motivo
  useEffect(() => {
    onUnauthorized(() => navigate('/login', { replace: true, state: { sessionExpired: true, from } }));
    return () => onUnauthorized(null);
  }, [navigate, from]);

  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  // Nota: token presente mas vencido vai direto ao login com aviso, sem mostrar a tela antes do 401
  if (!hasActiveSession()) {
    return <Navigate to="/login" replace state={{ sessionExpired: true, from }} />;
  }

  return children;
}

export default ProtectedRoute;
