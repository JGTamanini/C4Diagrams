import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ElementFormModal from './ElementFormModal';

const containerTarget = {
  kind: 'node',
  type: 'c4-container',
  data: { label: 'API', description: 'Regras de negócio', technology: 'Node.js' },
};

function renderModal(target, handlers = {}) {
  const props = { onSave: vi.fn(), onDelete: vi.fn(), onClose: vi.fn(), ...handlers };
  render(<ElementFormModal target={target} {...props} />);
  return props;
}

describe('ElementFormModal (RF22 - versão mínima)', () => {
  describe('elemento', () => {
    it('deve abrir com os valores atuais e o tipo do elemento, focando o título', () => {
      renderModal(containerTarget);

      expect(screen.getByRole('dialog', { name: 'Editar elemento' })).toBeInTheDocument();
      expect(screen.getByText('Container')).toBeInTheDocument();
      expect(screen.getByLabelText('Título')).toHaveValue('API');
      expect(screen.getByLabelText('Título')).toHaveFocus();
      expect(screen.getByLabelText('Descrição')).toHaveValue('Regras de negócio');
      expect(screen.getByLabelText('Tecnologia')).toHaveValue('Node.js');
    });

    it('não deve oferecer tecnologia para tipos que não a possuem (pessoa e sistemas)', () => {
      renderModal({ kind: 'node', type: 'c4-person', data: { label: 'Cliente' } });

      expect(screen.getByLabelText('Descrição')).toHaveValue('');
      expect(screen.queryByLabelText('Tecnologia')).not.toBeInTheDocument();
    });

    it('deve salvar os valores sem espaços nas pontas', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal(containerTarget);

      await user.clear(screen.getByLabelText('Título'));
      await user.type(screen.getByLabelText('Título'), '  API de Pedidos  ');
      await user.clear(screen.getByLabelText('Tecnologia'));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSave).toHaveBeenCalledWith({ label: 'API de Pedidos', description: 'Regras de negócio', technology: '' });
    });

    it('deve salvar a descrição editada', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal({ kind: 'node', type: 'c4-person', data: { label: 'Cliente' } });

      await user.type(screen.getByLabelText('Descrição'), 'Compra pela loja');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSave).toHaveBeenCalledWith({ label: 'Cliente', description: 'Compra pela loja' });
    });

    it('deve exigir o título', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal(containerTarget);

      await user.clear(screen.getByLabelText('Título'));
      await user.type(screen.getByLabelText('Título'), '   ');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(screen.getByRole('alert')).toHaveTextContent('O título é obrigatório.');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('deve respeitar os limites de tamanho aceitos pelo backend', () => {
      renderModal(containerTarget);

      expect(screen.getByLabelText('Título')).toHaveAttribute('maxLength', '100');
      expect(screen.getByLabelText('Descrição')).toHaveAttribute('maxLength', '1000');
      expect(screen.getByLabelText('Tecnologia')).toHaveAttribute('maxLength', '100');
    });
  });

  describe('conexão', () => {
    const edgeTarget = { kind: 'edge', label: 'Usa', data: { technology: 'JSON/HTTPS' } };

    it('deve editar rótulo e tecnologia da conexão', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal(edgeTarget);

      expect(screen.getByRole('dialog', { name: 'Editar conexão' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Descrição')).not.toBeInTheDocument();
      await user.clear(screen.getByLabelText('Rótulo'));
      await user.type(screen.getByLabelText('Rótulo'), 'Envia pedidos para');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSave).toHaveBeenCalledWith({ label: 'Envia pedidos para', technology: 'JSON/HTTPS' });
    });

    it('deve exigir o rótulo (notação oficial)', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal({ kind: 'edge', label: 'Usa', data: {} });

      await user.clear(screen.getByLabelText('Rótulo'));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(screen.getByRole('alert')).toHaveTextContent('O rótulo é obrigatório.');
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('ações', () => {
    it('deve excluir pelo botão Excluir', async () => {
      const user = userEvent.setup();
      const { onDelete, onSave } = renderModal(containerTarget);

      await user.click(screen.getByRole('button', { name: 'Excluir' }));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onSave).not.toHaveBeenCalled();
    });

    it.each([
      ['Cancelar', (user) => user.click(screen.getByRole('button', { name: 'Cancelar' }))],
      ['Fechar', (user) => user.click(screen.getByRole('button', { name: 'Fechar' }))],
      ['Esc', (user) => user.keyboard('{Escape}')],
    ])('deve fechar sem salvar por %s', async (_, closeWith) => {
      const user = userEvent.setup();
      const { onClose, onSave } = renderModal(containerTarget);

      await closeWith(user);

      expect(onClose).toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
