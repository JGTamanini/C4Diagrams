import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagramLegend from './DiagramLegend';
import { vi } from 'vitest';

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

  describe('ao lado do painel da direita', () => {
    // Observador de tamanho controlável: o teste decide quando "algo mudou de tamanho"
    let resizeCallbacks;
    let obstacleBottom;

    beforeEach(() => {
      resizeCallbacks = [];
      globalThis.ResizeObserver = class {
        constructor(callback) {
          resizeCallbacks.push(callback);
        }
        observe() {
          // a medição inicial é feita pelo próprio componente
        }
        disconnect() {
          // sem efeito no teste
        }
      };
      // A legenda começa em y = 700 (canto inferior); o painel termina onde o teste disser
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
        if (this.getAttribute('aria-label') === 'Legenda') return { top: 700, bottom: 880 };
        if (this.dataset.testid === 'painel') return { top: 12, bottom: obstacleBottom };
        return { top: 0, bottom: 0 };
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      delete globalThis.ResizeObserver;
    });

    function renderBesidePanel() {
      const panel = document.createElement('div');
      panel.dataset.testid = 'painel';
      document.body.append(panel);
      render(<DiagramLegend nodes={[node('a', 'c4-person')]} edges={[]} rightInset={300} rightObstacle={panel} />);
      return screen.getByRole('region', { name: 'Legenda' });
    }

    it('deve ficar no canto quando o painel não desce até ela', () => {
      obstacleBottom = 400;

      expect(renderBesidePanel()).toHaveStyle({ right: '16px' });
    });

    it('deve se afastar quando o painel desce até a altura dela', () => {
      obstacleBottom = 695;

      expect(renderBesidePanel()).toHaveStyle({ right: '316px' });
    });

    it('deve acompanhar o painel quando ele cresce ou diminui', () => {
      obstacleBottom = 400;
      const legend = renderBesidePanel();

      obstacleBottom = 760;
      act(() => resizeCallbacks.forEach((callback) => callback([])));
      expect(legend).toHaveStyle({ right: '316px' });

      obstacleBottom = 300;
      act(() => resizeCallbacks.forEach((callback) => callback([])));
      expect(legend).toHaveStyle({ right: '16px' });
    });
  });
});
