import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PublicOnlyRoute from './PublicOnlyRoute';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projetos" element={<p>Meus projetos</p>} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <p>Tela pública</p>
            </PublicOnlyRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublicOnlyRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve exibir a tela pública quando não houver sessão', () => {
    renderAt('/login');

    expect(screen.getByText('Tela pública')).toBeInTheDocument();
  });

  it('deve redirecionar para /projetos quando houver sessão', () => {
    localStorage.setItem('token', 'header.payload.signature');

    renderAt('/login');

    expect(screen.getByText('Meus projetos')).toBeInTheDocument();
    expect(screen.queryByText('Tela pública')).not.toBeInTheDocument();
  });
});
