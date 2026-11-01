import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ElementPalette, { ELEMENT_DRAG_TYPE } from './ElementPalette';

// Nome acessível (completo); o texto visível na grade é o nome curto
function itemNames() {
  return within(screen.getByRole('list')).getAllByRole('button').map((button) => button.getAttribute('aria-label'));
}

describe('ElementPalette', () => {
  it('deve listar só os elementos do nível ativo (RN08)', () => {
    render(<ElementPalette level="context" onAdd={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Elementos' })).toBeInTheDocument();
    expect(itemNames()).toEqual(['Pessoa', 'Sistema de Software', 'Sistema Externo']);
  });

  it('deve trocar os elementos conforme o nível', () => {
    render(<ElementPalette level="component" onAdd={vi.fn()} />);

    expect(itemNames()).toEqual(['Pessoa', 'Sistema Externo', 'Container', 'Banco de Dados', 'Componente']);
  });

  it('deve adicionar o elemento ao clicar (alternativa ao arrastar, acessível pelo teclado)', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<ElementPalette level="container" onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Banco de Dados' }));

    expect(onAdd).toHaveBeenCalledWith('c4-container-db');
  });

  it('deve levar o tipo do elemento ao ser arrastado para o canvas', () => {
    render(<ElementPalette level="context" onAdd={vi.fn()} />);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };

    fireEvent.dragStart(screen.getByRole('button', { name: 'Pessoa' }), { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(ELEMENT_DRAG_TYPE, 'c4-person');
    expect(dataTransfer.effectAllowed).toBe('move');
  });

  it('deve mostrar a miniatura do elemento com o nome curto e o nome completo como dica', () => {
    render(<ElementPalette level="container" onAdd={vi.fn()} />);

    const database = screen.getByRole('button', { name: 'Banco de Dados' });
    expect(database).toHaveTextContent('Banco de dados');
    expect(database).toHaveAttribute('title', 'Banco de Dados — arraste para o canvas ou clique para adicionar');
    expect(within(database).getByTestId('element-glyph')).toHaveAttribute('data-shape', 'database');
  });

  describe('recolher na vertical', () => {
    it('deve oferecer recolher a paleta, deixando só o título', async () => {
      const user = userEvent.setup();
      const onToggleCollapsed = vi.fn();
      render(<ElementPalette level="context" onAdd={vi.fn()} onToggleCollapsed={onToggleCollapsed} />);

      const toggle = screen.getByRole('button', { name: 'Recolher elementos' });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await user.click(toggle);

      expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it('recolhida, deve mostrar só o título e o botão para expandir', () => {
      render(<ElementPalette level="context" onAdd={vi.fn()} collapsed onToggleCollapsed={vi.fn()} />);

      expect(screen.getByRole('heading', { name: 'Elementos' })).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
      expect(screen.queryByText('Arraste para o canvas ou clique')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expandir elementos' })).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
