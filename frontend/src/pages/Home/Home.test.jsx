import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fakeJwt } from '../../test/fakeJwt';
import Home from './Home';

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Home', () => {
  it('deve exibir o título principal da página', () => {
    renderWithRouter(<Home />);

    expect(
      screen.getByRole('heading', { name: /documente a arquitetura/i })
    ).toBeInTheDocument();
  });

  it('deve exibir link para a página de cadastro', () => {
    renderWithRouter(<Home />);

    const link = screen.getByRole('link', { name: /começar agora/i });
    expect(link).toHaveAttribute('href', '/cadastro');
  });

  it('deve exibir link para a página de login', () => {
    renderWithRouter(<Home />);

    const link = screen.getByRole('link', { name: /entrar/i });
    expect(link).toHaveAttribute('href', '/login');
  });
});
describe('Home com usuário logado', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', fakeJwt());
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve trocar os atalhos de cadastro e login por "Ir para meus projetos"', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Ir para meus projetos' })).toHaveAttribute('href', '/projetos');
    expect(screen.queryByRole('link', { name: /começar agora/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^entrar$/i })).not.toBeInTheDocument();
  });

  it('deve manter os atalhos de cadastro e login quando o token estiver vencido', () => {
    localStorage.setItem('token', fakeJwt({ expiresInSeconds: -60 }));

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /começar agora/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir para meus projetos' })).not.toBeInTheDocument();
  });
});
