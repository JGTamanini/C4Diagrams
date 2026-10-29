import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagramLegend from './DiagramLegend';

const node = (id, type) => ({ id, type, position: { x: 0, y: 0 }, data: { label: id } });

describe('DiagramLegend', () => {
  it('deve explicar cada tipo usado no diagrama, uma vez só, na ordem da notação', () => {
    render(
      <DiagramLegend
        nodes={[node('a', 'c4-system-external'), node('b', 'c4-person'), node('c', 'c4-person')]}
        edges={[]}
      />
    );

    const legend = screen.getByRole('region', { name: 'Legenda' });
    const items = within(legend).getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual(['Pessoa', 'Sistema Externo']);
  });

  it('deve usar as cores oficiais do tipo na amostra', () => {
    render(<DiagramLegend nodes={[node('a', 'c4-container-db')]} edges={[]} />);

    expect(screen.getByTestId('legend-swatch-c4-container-db')).toHaveStyle({ backgroundColor: '#438DD5' });
  });

  it('deve explicar o relacionamento quando houver conexões', () => {
    render(<DiagramLegend nodes={[node('a', 'c4-person'), node('b', 'c4-system')]} edges={[{ id: 'e1' }]} />);

    expect(screen.getByText('Relacionamento (rótulo [tecnologia])')).toBeInTheDocument();
  });

  it('deve começar aberta e poder ser recolhida e reaberta pelo botão, para não cobrir elementos do diagrama', async () => {
    const user = userEvent.setup();
    render(<DiagramLegend nodes={[node('a', 'c4-person')]} edges={[]} />);
    const toggle = screen.getByRole('button', { name: 'Legenda' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list')).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument());

    await user.click(toggle);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('deve ter largura fixa e itens em uma linha só, para o botão não mudar de tamanho ao recolher', () => {
    render(<DiagramLegend nodes={[node('a', 'c4-system')]} edges={[{ id: 'e1' }]} />);

    expect(screen.getByRole('region', { name: 'Legenda' })).toHaveClass('w-72');
    expect(screen.getByRole('listitem')).toHaveClass('whitespace-nowrap');
  });

  it('não deve aparecer em um diagrama vazio', () => {
    render(<DiagramLegend nodes={[]} edges={[]} />);

    expect(screen.queryByRole('region', { name: 'Legenda' })).not.toBeInTheDocument();
  });
});
