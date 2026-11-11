import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NumberedTextArea from './NumberedTextArea';

function renderArea(props = {}) {
  const ref = createRef();
  const view = render(<NumberedTextArea ref={ref} label="Texto" value="" onChange={vi.fn()} {...props} />);
  return { ref, ...view };
}

const numbers = (container) => [...container.querySelectorAll('[data-line-number]')];

describe('NumberedTextArea (modo textual)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve quebrar as linhas longas em vez de rolar para o lado', () => {
    renderArea({ value: 'Container(api, "API")' });

    expect(screen.getByLabelText('Texto')).not.toHaveAttribute('wrap', 'off');
  });

  it('deve numerar só as linhas reais do texto, inclusive as vazias', () => {
    const { container } = renderArea({ value: 'Person(a, "A")\nSystem(b, "B")\n\nRel(a, b, "Usa")' });

    expect(numbers(container).map((number) => number.textContent)).toEqual(['1', '2', '3', '4']);
  });

  // A linha longa quebra na tela, mas continua sendo uma linha só: o número dela ocupa a altura da linha inteira,
  // e a continuação não ganha número
  it('deve dar a cada número a altura da sua linha na tela, medida numa cópia invisível do texto', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function offsetHeight() {
      if (!this.hasAttribute('data-mirror-line')) return 0;
      return this.textContent.length > 20 ? 40 : 20;
    });

    const { container } = renderArea({ value: 'curta\numa linha bem mais longa que quebra na tela' });

    expect(numbers(container).map((number) => number.style.height)).toEqual(['20px', '40px']);
  });

  it('deve destacar o número das linhas com erro', () => {
    const { container } = renderArea({ value: 'a\nb\nc', errorLines: [2] });

    expect(numbers(container).map((number) => number.dataset.error)).toEqual(['false', 'true', 'false']);
  });

  // Review da #78: erros do diagrama inteiro (ex.: limite de elementos) vêm com a linha 0
  it('não deve fazer nada com uma linha menor que 1', () => {
    const { ref } = renderArea({ value: 'aa\nbbb' });
    const textarea = screen.getByLabelText('Texto');

    act(() => ref.current.selectLine(0));

    expect(textarea).not.toHaveFocus();
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([0, 0]);
  });

  it('deve selecionar uma linha inteira pelo número, para mostrar onde está o erro', () => {
    const { ref } = renderArea({ value: 'aa\nbbb\ncccc' });
    const textarea = screen.getByLabelText('Texto');

    act(() => ref.current.selectLine(3));

    expect(textarea).toHaveFocus();
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([7, 11]);
  });
});
