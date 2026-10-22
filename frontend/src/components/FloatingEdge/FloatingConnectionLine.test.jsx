import { render } from '@testing-library/react';
import FloatingConnectionLine from './FloatingConnectionLine';

const fromNode = { internals: { positionAbsolute: { x: 0, y: 0 } }, measured: { width: 200, height: 100 } };

function renderLine(toX, toY) {
  return render(
    <svg>
      <FloatingConnectionLine fromNode={fromNode} toX={toX} toY={toY} />
    </svg>
  );
}

describe('FloatingConnectionLine', () => {
  it('deve sair da borda do elemento virada para o cursor, em linha reta como a conexão final', () => {
    const { container } = renderLine(500, 50);

    expect(container.querySelector('path')).toHaveAttribute('d', 'M 200 50 L 500 50');
  });

  it('deve acompanhar o cursor por qualquer lado do elemento', () => {
    const { container } = renderLine(100, 400);

    expect(container.querySelector('path')).toHaveAttribute('d', 'M 100 100 L 100 400');
  });

  it('deve "grudar" na borda do elemento alvo ao passar sobre ele, como a conexão final vai ficar', () => {
    const toNode = { internals: { positionAbsolute: { x: 400, y: 0 } }, measured: { width: 200, height: 100 } };
    const { container } = render(
      <svg>
        <FloatingConnectionLine fromNode={fromNode} toNode={toNode} toX={450} toY={90} />
      </svg>
    );

    expect(container.querySelector('path')).toHaveAttribute('d', 'M 200 50 L 400 50');
  });

  it('não deve grudar no próprio elemento de origem', () => {
    const { container } = render(
      <svg>
        <FloatingConnectionLine fromNode={fromNode} toNode={fromNode} toX={500} toY={50} />
      </svg>
    );

    expect(container.querySelector('path')).toHaveAttribute('d', 'M 200 50 L 500 50');
  });

  it('não deve desenhar nada sem o elemento de origem', () => {
    const { container } = render(
      <svg>
        <FloatingConnectionLine fromNode={null} toX={10} toY={10} />
      </svg>
    );

    expect(container.querySelector('path')).toBeNull();
  });
});
