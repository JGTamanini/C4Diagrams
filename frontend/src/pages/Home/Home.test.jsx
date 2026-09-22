import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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