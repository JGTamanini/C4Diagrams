import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ColumnSplitter from './ColumnSplitter';

function renderSplitter(props = {}) {
  const onChange = vi.fn();
  render(
    <ColumnSplitter
      label="Ajustar altura da paleta"
      value={200}
      min={100}
      getMax={() => 400}
      getStartValue={() => 180}
      onChange={onChange}
      {...props}
    />
  );
  return { onChange, splitter: screen.getByRole('separator', { name: 'Ajustar altura da paleta' }) };
}

describe('ColumnSplitter', () => {
  it('deve se apresentar como divisória ajustável, com valor atual e limites', () => {
    const { splitter } = renderSplitter();

    expect(splitter).toHaveAttribute('aria-orientation', 'horizontal');
    expect(splitter).toHaveAttribute('aria-valuenow', '200');
    expect(splitter).toHaveAttribute('aria-valuemin', '100');
    expect(splitter).toHaveAttribute('aria-valuemax', '400');
    expect(splitter).toHaveAttribute('tabindex', '0');
  });

  it('deve ajustar pelo teclado, sem passar dos limites', () => {
    const { splitter, onChange } = renderSplitter({ value: 390 });

    fireEvent.keyDown(splitter, { key: 'ArrowDown' });
    fireEvent.keyDown(splitter, { key: 'ArrowUp' });
    fireEvent.keyDown(splitter, { key: 'Enter' });

    expect(onChange.mock.calls).toEqual([[400], [374]]);
  });

  it('deve ajustar arrastando, até soltar', () => {
    const { splitter, onChange } = renderSplitter();

    fireEvent.pointerDown(splitter, { clientY: 100 });
    fireEvent.pointerMove(window, { clientY: 160 });
    fireEvent.pointerMove(window, { clientY: 900 });
    fireEvent.pointerUp(window);
    fireEvent.pointerMove(window, { clientY: 120 });

    expect(onChange.mock.calls).toEqual([[260], [400]]);
  });

  it('deve partir da altura medida quando ainda não houver valor definido (altura automática)', () => {
    const { splitter, onChange } = renderSplitter({ value: null });

    fireEvent.keyDown(splitter, { key: 'ArrowDown' });

    expect(onChange).toHaveBeenCalledWith(196);
  });

  it('deve ler o limite na hora do ajuste (a coluna pode ter mudado de tamanho depois de desenhar)', () => {
    let columnLimit = 150;
    const { splitter, onChange } = renderSplitter({ value: 380, getMax: () => columnLimit });

    columnLimit = 400;
    fireEvent.keyDown(splitter, { key: 'ArrowDown' });
    fireEvent.pointerDown(splitter, { clientY: 100 });
    fireEvent.pointerMove(window, { clientY: 200 });
    fireEvent.pointerUp(window);

    expect(onChange.mock.calls).toEqual([[396], [400]]);
  });

  it('deve parar de ouvir o mouse se sair da tela no meio do arraste', () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <ColumnSplitter label="Divisória" value={200} min={100} getMax={() => 400} getStartValue={() => 200} onChange={onChange} />
    );
    fireEvent.pointerDown(screen.getByRole('separator'), { clientY: 100 });

    unmount();
    fireEvent.pointerMove(window, { clientY: 150 });

    expect(onChange).not.toHaveBeenCalled();
  });
});
