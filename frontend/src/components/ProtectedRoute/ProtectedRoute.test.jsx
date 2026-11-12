import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { fakeJwt } from '../../test/fakeJwt';
import api from '../../services/api';

function LoginProbe() {
  const location = useLocation();
  return (
    <p>
      Tela de login {location.state?.sessionExpired ? '(sessão expirada)' : ''} vindo de {location.state?.from}
    </p>
  );
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/compartilhado/:token"
          element={
            <ProtectedRoute>
              <p>Projeto compartilhado</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projetos"
          element={
            <ProtectedRoute>
              <p>Conteúdo protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function simulateAuthenticated401() {
  const rejected = api.interceptors.response.handlers[0].rejected;
  return rejected({ response: { status: 401 }, config: { headers: { Authorization: 'Bearer t' } } }).catch(() => {});
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve redirecionar para /login quando não houver token', () => {
    renderAt('/projetos');

    expect(screen.getByText(/tela de login/i)).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  // Link de visualização: sem login, entra e volta para o link
  it('deve levar ao login guardando de onde veio, para voltar depois de entrar', () => {
    renderAt('/compartilhado/abc123');

    expect(screen.getByText(/tela de login/i)).toHaveTextContent('vindo de /compartilhado/abc123');
  });

  it('deve renderizar o conteúdo quando houver token', () => {
    localStorage.setItem('token', fakeJwt());

    renderAt('/projetos');

    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('deve levar ao login com aviso de sessão expirada quando o token já estiver vencido', () => {
    localStorage.setItem('token', fakeJwt({ expiresInSeconds: -60 }));

    renderAt('/projetos');

    expect(screen.getByText(/tela de login/i)).toHaveTextContent('Tela de login (sessão expirada) vindo de /projetos');
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  it('deve levar ao login com aviso de sessão expirada quando a API responder 401', async () => {
    localStorage.setItem('token', fakeJwt());
    renderAt('/projetos');

    await act(simulateAuthenticated401);

    expect(screen.getByText(/tela de login/i)).toHaveTextContent('Tela de login (sessão expirada) vindo de /projetos');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('deve remover o handler de 401 ao desmontar', async () => {
    localStorage.setItem('token', fakeJwt());
    const { unmount } = renderAt('/projetos');
    unmount();

    await expect(simulateAuthenticated401()).resolves.toBeUndefined();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
