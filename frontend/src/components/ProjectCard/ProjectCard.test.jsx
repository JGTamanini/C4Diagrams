import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectCard from './ProjectCard';

const project = {
  id: 'p1',
  name: 'Loja Online',
  description: 'E-commerce',
  updated_at: '2026-09-28T15:00:00.000Z',
};

function renderCard(overrides = {}) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn() };
  render(
    <MemoryRouter>
      <ProjectCard project={{ ...project, ...overrides }} {...handlers} />
    </MemoryRouter>
  );
  return handlers;
}

describe('ProjectCard', () => {
  it('deve levar ao editor pelo nome e mostrar descrição e data da última edição', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Loja Online' })).toHaveAttribute('href', '/projetos/p1');
    expect(screen.getByText('E-commerce')).toBeInTheDocument();
    expect(screen.getByText('Editado em 28/09/2026')).toBeInTheDocument();
  });

  it('deve omitir a descrição quando não houver', () => {
    renderCard({ description: null });

    expect(screen.queryByText('E-commerce')).not.toBeInTheDocument();
  });

  it('deve acionar editar e excluir pelos botões do card', async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Editar projeto Loja Online' }));
    await user.click(screen.getByRole('button', { name: 'Excluir projeto Loja Online' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });
});
