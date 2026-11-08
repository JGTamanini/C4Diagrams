const Anthropic = require('@anthropic-ai/sdk').default;
const { createAnthropicProvider, createDemoProvider } = require('../../src/services/ai.provider');
const { AI_TIERS } = require('../../src/config/ai');
const { SUGGESTIONS_SCHEMA } = require('../../src/services/ai.prompt');
const { AiUnavailableError } = require('../../src/errors/ai.errors');

const answer = { suggestions: [{ kind: 'note', title: 'Descreva a loja' }] };

// Resposta da API: blocos de raciocínio (vazios por padrão) e o texto com o JSON pedido
function apiResponse(overrides = {}) {
  return {
    model: AI_TIERS.fast.model,
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: JSON.stringify(answer) },
    ],
    usage: { input_tokens: 2_000, output_tokens: 1_000 },
    ...overrides,
  };
}

function apiError(status, type) {
  return Anthropic.APIError.generate(status, { type: 'error', error: { type, message: type } }, type, new Headers());
}

function fakeClient() {
  return { messages: { create: jest.fn() }, beta: { messages: { create: jest.fn() } } };
}

const prompt = { system: 'regras', user: 'diagrama' };

describe('Provedores de IA', () => {
  describe('Anthropic', () => {
    it('deve pedir as sugestões rápidas ao Haiku, em JSON no formato fechado, com tempo máximo', async () => {
      const client = fakeClient();
      client.messages.create.mockResolvedValue(apiResponse());
      const provider = createAnthropicProvider({ client });

      const result = await provider.generate({ tier: 'fast', ...prompt });

      expect(client.messages.create).toHaveBeenCalledWith(
        {
          model: AI_TIERS.fast.model,
          max_tokens: AI_TIERS.fast.maxTokens,
          system: 'regras',
          messages: [{ role: 'user', content: 'diagrama' }],
          output_config: { effort: AI_TIERS.fast.effort, format: { type: 'json_schema', schema: SUGGESTIONS_SCHEMA } },
        },
        { timeout: AI_TIERS.fast.timeoutMs, maxRetries: 1 }
      );
      expect(result).toEqual({
        ok: true,
        suggestions: answer.suggestions,
        model: AI_TIERS.fast.model,
        cost: expect.closeTo(0.0007, 6),
      });
    });

    it('deve pedir ao Opus com o fallback da própria API para recusas por segurança', async () => {
      const client = fakeClient();
      client.beta.messages.create.mockResolvedValue(apiResponse({ model: AI_TIERS.deep.model }));
      const provider = createAnthropicProvider({ client });

      await provider.generate({ tier: 'deep', ...prompt });

      expect(client.messages.create).not.toHaveBeenCalled();
      expect(client.beta.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_TIERS.deep.model,
          max_tokens: AI_TIERS.deep.maxTokens,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        }),
        { timeout: AI_TIERS.deep.timeoutMs, maxRetries: 1 }
      );
    });

    it.each([
      ['recusa', { stop_reason: 'refusal', content: [] }, 'refused'],
      ['resposta cortada no limite de tokens', { stop_reason: 'max_tokens' }, 'truncated'],
      ['texto que não é o JSON pedido', { content: [{ type: 'text', text: 'não sei' }] }, 'invalid'],
      ['JSON sem a lista de sugestões', { content: [{ type: 'text', text: '{"outra":1}' }] }, 'invalid'],
    ])('deve indicar falha (sem lançar) em caso de %s, com o custo do que foi gasto', async (_, overrides, reason) => {
      const client = fakeClient();
      client.messages.create.mockResolvedValue(apiResponse(overrides));

      const result = await createAnthropicProvider({ client }).generate({ tier: 'fast', ...prompt });

      expect(result).toEqual({ ok: false, reason, model: AI_TIERS.fast.model, cost: expect.any(Number) });
      expect(result.cost).toBeGreaterThan(0);
    });

    it.each([
      [401, 'authentication_error'],
      [402, 'billing_error'],
      [403, 'permission_error'],
      [404, 'not_found_error'],
    ])('deve tratar o erro %s (%s: chave, créditos, permissão ou modelo) como IA indisponível', async (status, type) => {
      const client = fakeClient();
      client.messages.create.mockRejectedValue(apiError(status, type));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(createAnthropicProvider({ client }).generate({ tier: 'fast', ...prompt })).rejects.toThrow(
        AiUnavailableError
      );
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining(type));
      console.error.mockRestore();
    });

    it.each([
      ['instabilidade da API', apiError(529, 'overloaded_error')],
      ['falha de conexão', new Anthropic.APIConnectionError({ message: 'down' })],
    ])('deve indicar falha passageira (%s) sem lançar, para poder escalar', async (_, error) => {
      const client = fakeClient();
      client.messages.create.mockRejectedValue(error);
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createAnthropicProvider({ client }).generate({ tier: 'fast', ...prompt });

      expect(result).toEqual({ ok: false, reason: 'api_error', model: AI_TIERS.fast.model, cost: 0 });
      console.warn.mockRestore();
    });

    it('deve repassar erros que não vêm da API (falha do nosso código)', async () => {
      const client = fakeClient();
      client.messages.create.mockRejectedValue(new TypeError('bug'));

      await expect(createAnthropicProvider({ client }).generate({ tier: 'fast', ...prompt })).rejects.toThrow(TypeError);
    });

    it('deve criar o cliente do SDK com a chave quando nenhum for passado', () => {
      expect(createAnthropicProvider({ apiKey: 'sk-ant-teste' }).mode).toBe('anthropic');
    });
  });

  describe('Demonstração (só fora de produção)', () => {
    const node = (id, type, label, extra = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label, ...extra } });

    it('deve sugerir um ponto de partida de exemplo para cada nível vazio, sem custo', async () => {
      const provider = createDemoProvider();

      for (const level of ['context', 'container', 'component']) {
        const result = await provider.generate({
          tier: 'fast',
          context: { level, data: { nodes: [], edges: [] }, project: { name: 'Loja Online' } },
        });
        expect(result).toEqual({ ok: true, suggestions: expect.any(Array), model: 'demo', cost: 0 });
        expect(result.suggestions.some((item) => item.kind === 'add_element')).toBe(true);
      }
    });

    it('deve revisar de exemplo um nível com elementos, citando um elemento sem descrição', async () => {
      const data = {
        nodes: [node('n1', 'c4-person', 'Cliente', { description: 'Compra' }), node('n2', 'c4-system', 'Loja Online')],
        edges: [],
      };

      const { suggestions } = await createDemoProvider().generate({
        tier: 'deep',
        context: { level: 'context', data, project: { name: 'Loja Online' } },
      });

      expect(suggestions).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'improve_text', targetName: 'Loja Online' })])
      );
    });
  });
});
