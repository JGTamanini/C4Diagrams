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

describe('ElementFormModal (RF22)', () => {
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

    it('deve limitar título e descrição ao que cabe no elemento e no modal (descrição em até 4 linhas)', () => {
      renderModal(containerTarget);

      expect(screen.getByLabelText('Título')).toHaveAttribute('maxLength', '60');
      expect(screen.getByLabelText('Descrição')).toHaveAttribute('maxLength', '200');
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

  describe('relações do elemento', () => {
    const relations = [
      { id: 'e1', direction: 'out', otherLabel: 'Banco', label: 'Lê e grava', technology: 'SQL' },
      { id: 'e2', direction: 'in', otherLabel: 'Aplicação Web', label: 'Faz chamadas para', technology: '' },
    ];

    it('deve listar as relações com o sentido, o outro elemento, o rótulo e a tecnologia', () => {
      renderModal(containerTarget, { relations });

      expect(screen.getByRole('heading', { name: 'Relações (2)' })).toBeInTheDocument();
      expect(screen.getByText('para Banco')).toBeInTheDocument();
      expect(screen.getByText('de Aplicação Web')).toBeInTheDocument();
      expect(screen.getByLabelText('Rótulo da relação com Banco')).toHaveValue('Lê e grava');
      expect(screen.getByLabelText('Tecnologia da relação com Banco')).toHaveValue('SQL');
    });

    it('deve salvar o elemento junto com as relações alteradas ou removidas', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal(containerTarget, { relations });

      await user.clear(screen.getByLabelText('Rótulo da relação com Banco'));
      await user.type(screen.getByLabelText('Rótulo da relação com Banco'), '  Grava pedidos em ');
      await user.click(screen.getByRole('button', { name: 'Remover relação com Aplicação Web' }));
      expect(screen.getByText('Será removida ao salvar')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSave).toHaveBeenCalledWith(
        { label: 'API', description: 'Regras de negócio', technology: 'Node.js' },
        { updated: [{ id: 'e1', label: 'Grava pedidos em', technology: 'SQL' }], removed: ['e2'] }
      );
    });

    it('deve permitir desistir da remoção antes de salvar', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal(containerTarget, { relations });

      await user.click(screen.getByRole('button', { name: 'Remover relação com Banco' }));
      await user.click(screen.getByRole('button', { name: 'Manter relação com Banco' }));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(onSave).toHaveBeenCalledWith(expect.any(Object), { updated: [], removed: [] });
    });

    it('deve exigir o rótulo das relações que ficam', async () => {
      const user = userEvent.setup();
      const { onSave } = renderModal(containerTarget, { relations });

      await user.clear(screen.getByLabelText('Rótulo da relação com Banco'));
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Toda relação precisa de um rótulo.');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('deve ensinar a criar relação quando o elemento não tem nenhuma', () => {
      renderModal(containerTarget, { relations: [] });

      expect(screen.getByRole('heading', { name: 'Relações (0)' })).toBeInTheDocument();
      expect(screen.getByText(/arraste de um ponto de conexão/i)).toBeInTheDocument();
    });
  });

  describe('ligação entre níveis', () => {
    it('deve mostrar de qual elemento do nível acima ele faz parte', () => {
      renderModal(containerTarget, { levelInfo: { partOf: { label: 'Loja Online', type: 'Software System' }, detail: null } });

      expect(screen.getByText('Parte de:').closest('p')).toHaveTextContent('Parte de: Loja Online [Software System]');
    });

    it('deve levar ao nível que detalha o elemento em foco', async () => {
      const user = userEvent.setup();
      const onDetail = vi.fn();
      renderModal(
        { kind: 'node', type: 'c4-system', data: { label: 'Loja Online' } },
        { levelInfo: { partOf: null, detail: { levelName: 'Container', count: 4, isFocus: true } }, onDetail }
      );

      expect(screen.getByText('Detalhado no nível Container (4 elementos)')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Abrir nível Container' }));

      expect(onDetail).toHaveBeenCalled();
    });

    it('deve oferecer detalhar um elemento que ainda não é o foco do nível de baixo', async () => {
      const user = userEvent.setup();
      const onDetail = vi.fn();
      renderModal(
        { kind: 'node', type: 'c4-system', data: { label: 'ERP' } },
        { levelInfo: { partOf: null, detail: { levelName: 'Container', count: 0, isFocus: false } }, onDetail }
      );

      await user.click(screen.getByRole('button', { name: 'Detalhar no nível Container' }));

      expect(onDetail).toHaveBeenCalled();
      expect(screen.queryByText(/detalha um elemento por vez/)).not.toBeInTheDocument();
    });

    // Cada nível detalha um elemento por vez (RN06); no C4, detalha-se só o que agrega valor
    it('deve explicar que detalhar este elemento troca o foco do nível de baixo, quando ele já detalha outro', async () => {
      const user = userEvent.setup();
      const onDetail = vi.fn();
      renderModal(
        { kind: 'node', type: 'c4-container', data: { label: 'Aplicação Web' } },
        {
          levelInfo: {
            partOf: null,
            detail: { levelName: 'Componente', count: 3, isFocus: false, currentFocusLabel: 'API de Pedidos' },
          },
          onDetail,
        }
      );

      const note = screen.getByText(/O nível Componente detalha "API de Pedidos"/);
      expect(note).toHaveTextContent('Cada nível detalha um elemento por vez');
      expect(note).toHaveTextContent('no C4, só se detalha o que agrega valor');
      expect(note).toHaveTextContent('os 3 elementos que já estão lá continuam');
      await user.click(screen.getByRole('button', { name: 'Trocar o foco para este' }));

      expect(onDetail).toHaveBeenCalled();
    });
  });
});
