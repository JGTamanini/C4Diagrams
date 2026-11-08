const { resolveAiMode, costOf, AI_MODELS } = require('../../src/config/ai');

describe('Configuração da IA', () => {
  describe('resolveAiMode', () => {
    it('deve usar a Anthropic quando houver chave', () => {
      expect(resolveAiMode({ NODE_ENV: 'production', ANTHROPIC_API_KEY: 'sk-ant-123' })).toBe('anthropic');
    });

    it('deve ficar desligada sem chave (a chave vazia do deploy, antes do secret existir, também conta como sem chave)', () => {
      expect(resolveAiMode({ NODE_ENV: 'production' })).toBe('disabled');
      expect(resolveAiMode({ NODE_ENV: 'production', ANTHROPIC_API_KEY: '  ' })).toBe('disabled');
    });

    it('deve usar o modo demonstração só fora de produção, quando pedido', () => {
      expect(resolveAiMode({ NODE_ENV: 'development', AI_DEMO: 'true' })).toBe('demo');
      expect(resolveAiMode({ NODE_ENV: 'production', AI_DEMO: 'true' })).toBe('disabled');
    });

    it('deve preferir a chave real ao modo demonstração', () => {
      expect(resolveAiMode({ NODE_ENV: 'development', AI_DEMO: 'true', ANTHROPIC_API_KEY: 'sk-ant-123' })).toBe('anthropic');
    });
  });

  describe('costOf', () => {
    it('deve calcular o custo em dólares pelo preço do modelo (por milhão de tokens)', () => {
      expect(costOf(AI_MODELS.fast, { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(0.6);
      expect(costOf(AI_MODELS.deep, { input_tokens: 2_700, output_tokens: 3_000 })).toBeCloseTo(0.0708);
    });

    it('deve somar cada tentativa quando a API informa as tentativas (ex.: recusa refeita em outro modelo)', () => {
      const usage = {
        input_tokens: 1_000,
        output_tokens: 1_000,
        iterations: [
          { type: 'message', model: 'claude-opus-5-5', input_tokens: 1_000, output_tokens: 0 },
          { type: 'fallback_message', model: 'claude-opus-4-8', input_tokens: 1_000, output_tokens: 1_000 },
        ],
      };

      // Opus 5.5: 1000 × US$ 4/M; modelo de fallback (preço conservador): 1000 × US$ 5/M + 1000 × US$ 25/M
      expect(costOf(AI_MODELS.deep, usage)).toBeCloseTo(0.004 + 0.005 + 0.025);
    });

    it('deve tratar a ausência de uso como custo zero', () => {
      expect(costOf(AI_MODELS.fast, undefined)).toBe(0);
    });
  });
});
