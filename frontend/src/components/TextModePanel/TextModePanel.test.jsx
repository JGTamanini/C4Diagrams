import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TextModePanel from './TextModePanel';

const node = (id, type, label, data = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label, ...data } });
const nodes = [node('n1', 'c4-person', 'Cliente'), node('n2', 'c4-system', 'Loja')];
const edges = [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em', data: {} }];

function renderPanel(props = {}) {
  const handlers = { onApply: vi.fn(), onClose: vi.fn() };
  const view = render(<TextModePanel level="context" levelLabel="Contexto" nodes={nodes} edges={edges} {...handlers} {...props} />);
  return { ...handlers, ...view };
}

function textArea() {
  return screen.getByLabelText('Texto do nível Contexto');
}

// Coloca o texto de uma vez (digitar com o userEvent trataria { e [ como teclas especiais)
async function setText(user, value) {
  await user.clear(textArea());
  await user.click(textArea());
  await user.paste(value);
}

describe('TextModePanel (RF19)', () => {
  it('deve abrir com o nível atual em texto', () => {
    renderPanel();

    expect(screen.getByRole('complementary', { name: 'Modo textual' })).toBeInTheDocument();
    expect(textArea().value).toContain('Pessoa(cliente, "Cliente")');
    expect(textArea().value).toContain('Rel(cliente, loja, "Compra em")');
  });

  it('deve aplicar o que foi adicionado e dizer o que mudou', async () => {
    const user = userEvent.setup();
    const { onApply } = renderPanel();

    await user.click(textArea());
    await user.keyboard('{Control>}{End}{/Control}');
    await user.paste('\nSistemaExterno(email, "E-mail")');
    await user.click(screen.getByRole('button', { name: 'Aplicar ao canvas' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ addNodes: [expect.objectContaining({ type: 'c4-system-external' })] }));
    expect(screen.getByRole('status')).toHaveTextContent('Aplicado: 1 adicionado, 0 atualizados.');
  });

  it('deve mostrar os erros por linha e não aplicar nada', async () => {
    const user = userEvent.setup();
    const { onApply } = renderPanel();

    await setText(user, 'Container(api, "API")\nRel(api, nada, "Usa")');
    await user.click(screen.getByRole('button', { name: 'Aplicar ao canvas' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Linha 1: Container não pertence ao nível Contexto.');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('deve avisar quando não há nada para aplicar', async () => {
    const user = userEvent.setup();
    const { onApply } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Aplicar ao canvas' }));

    expect(screen.getByRole('status')).toHaveTextContent('Nada para aplicar: o texto é igual ao diagrama.');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('deve lembrar que apagar uma linha não exclui nada do canvas', async () => {
    const user = userEvent.setup();
    renderPanel();

    await setText(user, 'Pessoa(cliente, "Cliente VIP")');
    await user.click(screen.getByRole('button', { name: 'Aplicar ao canvas' }));

    expect(screen.getByRole('status')).toHaveTextContent('Aplicado: 0 adicionados, 1 atualizado.');
    expect(screen.getByRole('status')).toHaveTextContent('1 elemento que não está no texto continua no canvas; para excluir, use o canvas.');
  });

  it('deve gerar o texto de novo depois de aplicar, quando o diagrama atualiza', async () => {
    const user = userEvent.setup();
    const { rerender, onApply, onClose } = renderPanel();
    await setText(user, 'Pessoa(cliente, "Cliente VIP")');
    await user.click(screen.getByRole('button', { name: 'Aplicar ao canvas' }));

    const updated = [node('n1', 'c4-person', 'Cliente VIP'), nodes[1]];
    rerender(<TextModePanel level="context" levelLabel="Contexto" nodes={updated} edges={edges} onApply={onApply} onClose={onClose} />);

    expect(textArea().value).toContain('Pessoa(cliente_vip, "Cliente VIP")');
    expect(screen.queryByText(/O diagrama mudou/)).not.toBeInTheDocument();
  });

  it('deve avisar quando o canvas mudou desde que o texto foi gerado, e recarregar', async () => {
    const user = userEvent.setup();
    const { rerender, onApply, onClose } = renderPanel();

    const changed = [...nodes, node('n3', 'c4-system-external', 'Gateway')];
    rerender(<TextModePanel level="context" levelLabel="Contexto" nodes={changed} edges={edges} onApply={onApply} onClose={onClose} />);
    expect(screen.getByText('O diagrama mudou desde que o texto foi gerado.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Recarregar do canvas' }));

    expect(textArea().value).toContain('SistemaExterno(gateway, "Gateway")');
    expect(screen.queryByText(/O diagrama mudou/)).not.toBeInTheDocument();
  });

  it('não deve mudar o texto ao mover elementos (posição não entra no texto)', () => {
    const { rerender, onApply, onClose } = renderPanel();

    const moved = nodes.map((item) => ({ ...item, position: { x: 500, y: 500 }, selected: true }));
    rerender(<TextModePanel level="context" levelLabel="Contexto" nodes={moved} edges={edges} onApply={onApply} onClose={onClose} />);

    expect(screen.queryByText(/O diagrama mudou/)).not.toBeInTheDocument();
  });

  it('deve pedir confirmação antes de descartar o texto editado ao recarregar', async () => {
    const user = userEvent.setup();
    renderPanel();
    await setText(user, 'Pessoa(novo, "Novo")');

    await user.click(screen.getByRole('button', { name: 'Recarregar do canvas' }));
    expect(screen.getByText('Descartar o texto editado?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Manter o texto' }));
    expect(textArea()).toHaveValue('Pessoa(novo, "Novo")');

    await user.click(screen.getByRole('button', { name: 'Recarregar do canvas' }));
    await user.click(screen.getByRole('button', { name: 'Descartar e recarregar' }));
    expect(textArea().value).toContain('Pessoa(cliente, "Cliente")');
  });

  it('deve oferecer um exemplo só com o nível vazio', async () => {
    const user = userEvent.setup();
    renderPanel({ nodes: [], edges: [] });

    await user.click(screen.getByRole('button', { name: 'Inserir exemplo' }));

    expect(textArea().value).toContain('Sistema(loja, "Loja Online"');
  });

  it('não deve oferecer o exemplo quando o nível já tem elementos', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: 'Inserir exemplo' })).not.toBeInTheDocument();
  });

  it('deve fechar pelo botão do painel', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Fechar modo textual' }));

    expect(onClose).toHaveBeenCalled();
  });
});
