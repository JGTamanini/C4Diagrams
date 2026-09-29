import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ProjectFormModal from './ProjectFormModal';

function renderModal(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const onClose = props.onClose ?? vi.fn();
  render(<ProjectFormModal onSubmit={onSubmit} onClose={onClose} {...props} />);
  return { onSubmit, onClose };
}

describe('ProjectFormModal', () => {
  describe('modo criação', () => {
    it('deve exibir o título, os campos e o botão Criar, com foco no nome', () => {
      renderModal();

      expect(screen.getByRole('dialog', { name: 'Novo Projeto' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome do Projeto')).toHaveFocus();
      expect(screen.getByLabelText('Nome do Projeto')).toHaveAttribute('maxLength', '255');
      expect(screen.getByLabelText('Descrição')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
    });

    it('deve enviar nome e descrição preenchidos', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText('Nome do Projeto'), 'Loja Online');
      await user.type(screen.getByLabelText('Descrição'), 'Arquitetura do e-commerce');
      await user.click(screen.getByRole('button', { name: 'Criar' }));

      expect(onSubmit).toHaveBeenCalledWith({ name: 'Loja Online', description: 'Arquitetura do e-commerce' });
    });

    it('deve impedir o envio e avisar quando o nome tiver só espaços (RN04)', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal();

      await user.type(screen.getByLabelText('Nome do Projeto'), '   ');
      await user.click(screen.getByRole('button', { name: 'Criar' }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('O nome do projeto é obrigatório.');
    });

    it('deve exibir a mensagem da API e manter o modal aberto quando o envio falhar', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue({ response: { data: { message: 'O campo "name" deve ter no máximo 255 caracteres.' } } });
      const { onClose } = renderModal({ onSubmit });

      await user.type(screen.getByLabelText('Nome do Projeto'), 'Loja');
      await user.click(screen.getByRole('button', { name: 'Criar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('O campo "name" deve ter no máximo 255 caracteres.');
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Criar' })).toBeEnabled();
    });

    it('deve exibir mensagem genérica quando o erro não trouxer mensagem da API', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network Error'));
      renderModal({ onSubmit });

      await user.type(screen.getByLabelText('Nome do Projeto'), 'Loja');
      await user.click(screen.getByRole('button', { name: 'Criar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o projeto. Tente novamente.');
    });

    it('deve desabilitar o botão enquanto o envio está em andamento', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = vi.fn(() => new Promise((resolve) => { resolveSubmit = resolve; }));
      renderModal({ onSubmit });

      await user.type(screen.getByLabelText('Nome do Projeto'), 'Loja');
      await user.click(screen.getByRole('button', { name: 'Criar' }));

      expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled();
      resolveSubmit();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });
  });

  describe('modo edição (RF05)', () => {
    it('deve vir preenchido com os valores atuais e enviar as alterações', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderModal({ mode: 'edit', initialValues: { name: 'Loja', description: null } });

      expect(screen.getByRole('dialog', { name: 'Editar Projeto' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome do Projeto')).toHaveValue('Loja');
      expect(screen.getByLabelText('Descrição')).toHaveValue('');

      await user.clear(screen.getByLabelText('Nome do Projeto'));
      await user.type(screen.getByLabelText('Nome do Projeto'), 'Loja v2');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSubmit).toHaveBeenCalledWith({ name: 'Loja v2', description: '' });
    });
  });

  describe('fechamento', () => {
    it.each([
      ['Cancelar', (user) => user.click(screen.getByRole('button', { name: 'Cancelar' }))],
      ['botão fechar', (user) => user.click(screen.getByRole('button', { name: 'Fechar' }))],
      ['tecla Esc', (user) => user.keyboard('{Escape}')],
    ])('deve fechar via %s sem enviar', async (_, action) => {
      const user = userEvent.setup();
      const { onSubmit, onClose } = renderModal();

      await action(user);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
