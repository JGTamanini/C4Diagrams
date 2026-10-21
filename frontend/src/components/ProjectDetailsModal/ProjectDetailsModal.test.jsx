import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectDetailsModal from './ProjectDetailsModal';

const project = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962',
  name: 'Loja Online',
  description: 'E-commerce',
  updated_at: '2026-09-28T15:00:00.000Z',
  preview: {
    nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } }],
    edges: [],
  },
};

function renderModal(props = {}) {
  const handlers = { onSave: vi.fn(), onDelete: vi.fn(), onClose: vi.fn(), ...props };
  render(
    <MemoryRouter>
      <ProjectDetailsModal project={project} {...handlers} />
    </MemoryRouter>
  );
  return handlers;
}

describe('ProjectDetailsModal', () => {
  it('deve mostrar a prévia grande do Contexto, os dados do projeto e o atalho para o editor', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Loja Online' })).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do projeto')).toHaveValue('Loja Online');
    expect(screen.getByLabelText('Descrição')).toHaveValue('E-commerce');
    expect(screen.getByText('Editado em 28/09/2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir editor' })).toHaveAttribute('href', `/projetos/${project.id}`);
  });

  it('deve habilitar "Salvar alterações" só depois de alguma mudança', async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal();
    const save = screen.getByRole('button', { name: 'Salvar alterações' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText('Descrição'), ' de roupas');
    await user.click(save);

    expect(onSave).toHaveBeenCalledWith({ name: 'Loja Online', description: 'E-commerce de roupas' });
  });

  it('deve exigir o nome do projeto', async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal();

    await user.clear(screen.getByLabelText('Nome do projeto'));
    await user.type(screen.getByLabelText('Nome do projeto'), '   ');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(screen.getByRole('alert')).toHaveTextContent('O nome do projeto é obrigatório.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('deve mostrar o erro da API ao salvar e permitir tentar de novo', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue({ response: { data: { message: 'Nome muito longo.' } } });
    renderModal({ onSave });

    await user.type(screen.getByLabelText('Nome do projeto'), '!');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nome muito longo.');
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
  });

  it('deve pedir a exclusão pelo botão "Excluir projeto"', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Excluir projeto' }));

    expect(onDelete).toHaveBeenCalledWith(project);
  });

  it('deve indicar quando o diagrama de Contexto ainda está vazio', () => {
    render(
      <MemoryRouter>
        <ProjectDetailsModal project={{ ...project, preview: null }} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Diagrama de Contexto vazio')).toBeInTheDocument();
  });
});
