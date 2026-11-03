import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AiSuggestions from './AiSuggestions';

const node = (id, type, label) => ({ id, type, position: { x: 0, y: 0 }, data: { label } });
const nodes = [node('n1', 'c4-person', 'Cliente'), node('n2', 'c4-system', 'Loja Online')];
const edges = [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em' }];

function suggestion(fields) {
  return {
    kind: 'note',
    title: 'Título',
    reason: 'Motivo',
    elementType: null,
    name: null,
    description: null,
    technology: null,
    source: null,
    target: null,
    targetName: null,
    nodeId: null,
    ...fields,
  };
}

function aiState(overrides = {}) {
  return {
    mode: 'anthropic',
    limits: { suggestion: 20, deep: 3 },
    remaining: { suggestion: 20, deep: 3 },
    loading: null,
    busy: false,
    error: null,
    result: null,
    generate: vi.fn(),
    cancel: vi.fn(),
    dismiss: vi.fn(),
    ...overrides,
  };
}

function renderTab(props = {}) {
  const onSelectElement = vi.fn();
  const ai = props.ai ?? aiState();
  render(
    <AiSuggestions
      ai={ai}
      nodes={nodes}
      edges={edges}
      projectDescription="E-commerce de livros"
      onSelectElement={onSelectElement}
      {...props}
    />
  );
  return { ai, onSelectElement };
}

describe('AiSuggestions (aba Sugestões do Assistente, RF16)', () => {
  it('deve avisar que a IA está indisponível, sem botões', () => {
    renderTab({ ai: aiState({ mode: 'disabled', remaining: null }) });

    expect(screen.getByText('As sugestões da IA estão indisponíveis no momento.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('deve mostrar que está carregando enquanto consulta a IA', () => {
    renderTab({ ai: aiState({ mode: 'loading' }) });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('deve deixar claro que o diagrama é enviado à IA e nunca é alterado por ela', () => {
    renderTab();

    expect(screen.getByText(/enviado à Anthropic/)).toBeInTheDocument();
    expect(screen.getByText(/nada é alterado no seu diagrama/i)).toBeInTheDocument();
  });

  it('deve sinalizar o modo demonstração', () => {
    renderTab({ ai: aiState({ mode: 'demo' }) });

    expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument();
  });

  describe('nível com elementos', () => {
    it('deve pedir melhorias ou a análise aprofundada, mostrando quantos pedidos restam hoje', async () => {
      const user = userEvent.setup();
      const { ai } = renderTab({ ai: aiState({ remaining: { suggestion: 19, deep: 2 } }) });

      expect(screen.getByText('Restam 19 hoje')).toBeInTheDocument();
      expect(screen.getByText('Restam 2 hoje')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Sugerir melhorias' }));
      await user.click(screen.getByRole('button', { name: 'Análise aprofundada' }));

      expect(ai.generate.mock.calls).toEqual([['standard'], ['deep']]);
    });

    it('deve desativar o pedido esgotado no dia', () => {
      renderTab({ ai: aiState({ remaining: { suggestion: 0, deep: 3 } }) });

      expect(screen.getByRole('button', { name: 'Sugerir melhorias' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Análise aprofundada' })).toBeEnabled();
    });
  });

  describe('nível vazio (ponto de partida)', () => {
    it('deve pedir a descrição do sistema, já com a do projeto, e gerar o ponto de partida', async () => {
      const user = userEvent.setup();
      const { ai } = renderTab({ nodes: [], edges: [] });

      const description = screen.getByLabelText('Descreva o sistema');
      expect(description).toHaveValue('E-commerce de livros');
      expect(description).toHaveAttribute('maxLength', '1000');
      await user.type(description, ' com pagamento por cartão');
      await user.click(screen.getByRole('button', { name: 'Gerar ponto de partida' }));

      expect(ai.generate).toHaveBeenCalledWith('standard', 'E-commerce de livros com pagamento por cartão');
    });

    it('deve exigir uma descrição para gerar o ponto de partida', () => {
      renderTab({ nodes: [], edges: [], projectDescription: null });

      expect(screen.getByRole('button', { name: 'Gerar ponto de partida' })).toBeDisabled();
    });
  });

  describe('pedido em andamento e erros', () => {
    it('deve mostrar o andamento com a opção de cancelar, sem permitir outro pedido', async () => {
      const user = userEvent.setup();
      const { ai } = renderTab({ ai: aiState({ loading: 'deep', busy: true }) });

      expect(screen.getByRole('status')).toHaveTextContent(/modelo avançado/);
      expect(screen.getByRole('button', { name: 'Sugerir melhorias' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(ai.cancel).toHaveBeenCalled();
    });

    it('deve mostrar o erro do pedido', () => {
      renderTab({ ai: aiState({ error: 'Você usou os 20 pedidos de sugestões de hoje. Volte amanhã.' }) });

      expect(screen.getByRole('alert')).toHaveTextContent('Volte amanhã');
    });
  });

  describe('resultado', () => {
    const result = {
      source: 'claude-haiku-5-5',
      escalated: false,
      suggestions: [
        suggestion({ id: 's1', kind: 'add_element', title: 'Adicione o gateway', elementType: 'c4-system-external', name: 'Gateway', reason: 'Pagamentos dependem dele.' }),
        suggestion({ id: 's2', kind: 'add_element', title: 'Adicione o cliente', elementType: 'c4-person', name: 'cliente' }),
        suggestion({ id: 's3', kind: 'add_relationship', title: 'Ligue a loja ao cliente', source: 'Loja Online', target: 'Cliente', description: 'Envia e-mails' }),
        suggestion({ id: 's4', kind: 'improve_text', title: 'Descreva a loja', targetName: 'Loja Online', nodeId: 'n2', description: 'Vende livros' }),
      ],
    };

    function item(title) {
      return screen.getByText(title).closest('li');
    }

    it('deve listar cada sugestão com o que fazer, os detalhes e o porquê', () => {
      renderTab({ ai: aiState({ result }) });

      expect(within(item('Adicione o gateway')).getByText('Sistema Externo: Gateway')).toBeInTheDocument();
      expect(within(item('Adicione o gateway')).getByText('Pagamentos dependem dele.')).toBeInTheDocument();
      expect(within(item('Ligue a loja ao cliente')).getByText('Loja Online → Cliente · "Envia e-mails"')).toBeInTheDocument();
      expect(within(item('Descreva a loja')).getByText('"Vende livros"')).toBeInTheDocument();
      expect(screen.getByText('Geradas pela IA')).toBeInTheDocument();
    });

    it('deve marcar como feito o que o usuário já construiu no diagrama (checklist)', () => {
      renderTab({ ai: aiState({ result }) });

      expect(within(item('Adicione o cliente')).getByText('Feito')).toBeInTheDocument();
      expect(within(item('Ligue a loja ao cliente')).getByText('Feito')).toBeInTheDocument();
      expect(within(item('Adicione o gateway')).queryByText('Feito')).not.toBeInTheDocument();
    });

    it('deve levar ao elemento citado e permitir ignorar a sugestão', async () => {
      const user = userEvent.setup();
      const { ai, onSelectElement } = renderTab({ ai: aiState({ result }) });

      await user.click(within(item('Descreva a loja')).getByRole('button', { name: 'Ver no diagrama' }));
      await user.click(within(item('Adicione o gateway')).getByRole('button', { name: 'Ignorar' }));

      expect(onSelectElement).toHaveBeenCalledWith({ nodeId: 'n2' });
      expect(ai.dismiss).toHaveBeenCalledWith('s1');
      expect(within(item('Adicione o gateway')).queryByRole('button', { name: 'Ver no diagrama' })).not.toBeInTheDocument();
    });

    it.each([
      [{ source: 'claude-opus-5-5', escalated: true }, 'Revisadas pelo modelo avançado'],
      [{ source: 'claude-opus-5-5', escalated: false }, 'Resultado da análise aprofundada'],
      [{ source: 'demo', escalated: false }, 'Exemplo (modo demonstração)'],
    ])('deve dizer de onde vieram as sugestões', (origin, label) => {
      renderTab({ ai: aiState({ result: { ...result, ...origin } }) });

      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('deve avisar quando todas as sugestões foram ignoradas', () => {
      renderTab({ ai: aiState({ result: { ...result, suggestions: [] } }) });

      expect(screen.getByText('Todas as sugestões foram ignoradas.')).toBeInTheDocument();
    });
  });
});
