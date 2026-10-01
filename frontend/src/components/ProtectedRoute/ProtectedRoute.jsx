import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { onUnauthorized } from '../../services/api';
import { getToken, hasActiveSession } from '../../services/session';

function ProtectedRoute({ children }) {
  const navigate = useNavigate();

  // Nota: o interceptor do api.js já limpou a sessão; aqui só redirecionamos avisando o motivo
  useEffect(() => {
    onUnauthorized(() => navigate('/login', { replace: true, state: { sessionExpired: true } }));
    return () => onUnauthorized(null);
  }, [navigate]);

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  // Nota: token presente mas vencido vai direto ao login com aviso, sem mostrar a tela antes do 401
  if (!hasActiveSession()) {
    return <Navigate to="/login" replace state={{ sessionExpired: true }} />;
  }

  return children;
}

export default ProtectedRoute;
