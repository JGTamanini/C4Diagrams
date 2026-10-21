import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useAuthIllustration } from './authIllustration';
import AuthItem from './AuthItem';

function FakeLogin() {
  useAuthIllustration('login');
  return (
    <AuthItem>
      <h1>Entrar</h1>
      <Link to="/cadastro">Cadastre-se</Link>
    </AuthItem>
  );
}

function FakeRegister() {
  useAuthIllustration('register');
  return <h1>Criar conta</h1>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<FakeLogin />} />
          <Route path="/cadastro" element={<FakeRegister />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthLayout', () => {
  it('deve exibir a tela da rota dentro do card, com a ilustração escolhida por ela', () => {
    renderAt('/login');

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByTestId('auth-card')).toContainElement(screen.getByRole('heading', { name: 'Entrar' }));
    expect(screen.getByTestId('auth-illustration')).toHaveAttribute('data-illustration', 'login');
  });

  it('deve trocar o conteúdo e a ilustração mantendo o mesmo card ao navegar entre as telas', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    const card = screen.getByTestId('auth-card');

    await user.click(screen.getByRole('link', { name: 'Cadastre-se' }));

    expect(await screen.findByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-card')).toBe(card);
    // A ilustração anterior sai com animação antes da nova entrar
    await waitFor(() => expect(screen.getByTestId('auth-illustration')).toHaveAttribute('data-illustration', 'register'));
  });

  it('deve permitir usar as telas fora do layout (o hook da ilustração não faz nada sem ele)', () => {
    render(
      <MemoryRouter>
        <FakeLogin />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
