import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ContextMenu from './ContextMenu';

const MENU_SIZE = { width: 200, height: 160 };

function renderAt(position, onClose = vi.fn()) {
  render(<ContextMenu label="Ações" position={position} items={[{ label: 'Copiar', onSelect: vi.fn() }]} onClose={onClose} />);
  return screen.getByRole('menu', { name: 'Ações' });
}

describe('ContextMenu', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      ...MENU_SIZE,
      top: 0,
      left: 0,
      right: MENU_SIZE.width,
      bottom: MENU_SIZE.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve abrir no ponto do clique quando houver espaço', () => {
    const menu = renderAt({ x: 100, y: 120 });

    expect(menu).toHaveStyle({ left: '100px', top: '120px' });
  });

  it('deve abrir para a esquerda e para cima perto do canto inferior direito, sem sair da tela', () => {
    const menu = renderAt({ x: 1000, y: 740 });

    expect(menu).toHaveStyle({ left: '800px', top: '580px' });
  });

  it('nunca deve começar fora da tela, mesmo numa janela menor que o menu', () => {
    window.innerWidth = 150;
    window.innerHeight = 100;

    const menu = renderAt({ x: 140, y: 90 });

    expect(menu).toHaveStyle({ left: '8px', top: '8px' });
  });

  it('deve fechar com clique fora ou Esc, mas não com clique dentro dele nem com outras teclas', () => {
    const onClose = vi.fn();
    const menu = renderAt({ x: 100, y: 120 }, onClose);

    fireEvent.mouseDown(menu);
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
