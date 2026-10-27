import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fakeJwt } from '../../test/fakeJwt';
import Home from './Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve exibir o título principal da página', () => {
    renderHome();

    expect(screen.getByRole('heading', { level: 1, name: /arquitetura de software clara/i })).toBeInTheDocument();
  });

  it('deve oferecer entrar e criar conta na barra de navegação', () => {
    renderHome();
    const nav = screen.getByRole('navigation', { name: 'Principal' });

    expect(within(nav).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(within(nav).getByRole('link', { name: /começar agora/i })).toHaveAttribute('href', '/cadastro');
  });

  it('deve levar todos os "Começar agora" ao cadastro', () => {
    renderHome();

    const links = screen.getAllByRole('link', { name: /começar agora/i });
    expect(links.length).toBeGreaterThan(1);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/cadastro'));
  });

  it('deve mostrar o produto de verdade nas funcionalidades, com descrição para leitores de tela', () => {
    renderHome();

    expect(screen.getByRole('img', { name: /paleta de elementos do nível container/i })).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('deve manter a barra de navegação fixa no topo ao rolar (sem contêiner que anule o sticky)', () => {
    const { container } = renderHome();

    expect(screen.getByRole('banner')).toHaveClass('sticky', 'top-0');
    expect(container.firstChild).not.toHaveClass('overflow-x-hidden');
  });

  it('deve apresentar as funcionalidades, com a IA marcada como em breve', () => {
    renderHome();

    ['Os elementos certos em cada nível', 'Notação C4 oficial, com legenda', 'Salvo a cada alteração', 'Assistência de IA'].forEach(
      (name) => {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
    );
    expect(screen.getByText('Em breve')).toBeInTheDocument();
  });

  it('deve explicar como funciona, em três passos, com atalho a partir do topo', () => {
    renderHome();

    expect(screen.getByRole('link', { name: 'Como funciona' })).toHaveAttribute('href', '#como-funciona');
    const section = screen.getByRole('region', { name: 'Como funciona' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(3);
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
    renderHome();

    screen.getAllByRole('link', { name: 'Ir para meus projetos' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/projetos');
    });
    expect(screen.queryByRole('link', { name: /começar agora/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^entrar$/i })).not.toBeInTheDocument();
  });

  it('deve manter os atalhos de cadastro e login quando o token estiver vencido', () => {
    localStorage.setItem('token', fakeJwt({ expiresInSeconds: -60 }));

    renderHome();

    expect(screen.getAllByRole('link', { name: /começar agora/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Ir para meus projetos' })).not.toBeInTheDocument();
  });
});
