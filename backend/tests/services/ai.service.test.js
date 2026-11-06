jest.mock('../../src/repositories/aiUsage.repository');
jest.mock('../../src/repositories/diagram.repository');
jest.mock('../../src/services/project.service');
jest.mock('../../src/services/ai.provider');

const aiUsageRepository = require('../../src/repositories/aiUsage.repository');
const diagramRepository = require('../../src/repositories/diagram.repository');
const projectService = require('../../src/services/project.service');
const aiProvider = require('../../src/services/ai.provider');
const aiService = require('../../src/services/ai.service');
const { AI_LIMITS, AI_TIERS } = require('../../src/config/ai');
const { AiUnavailableError, AiDailyLimitError, AiGenerationError, InvalidSuggestionRequestError } = require('../../src/errors/ai.errors');
const { InvalidDiagramLevelError, InvalidDiagramDataError } = require('../../src/errors/diagram.errors');

const userId = '8f14e45f-ceea-467a-9575-6f1c8e3b2a10';
const projectId = '3b241101-e2bb-4255-8caf-4136c566a962';
const project = { id: projectId, name: 'Loja Online', description: 'E-commerce' };

const node = (id, type, label) => ({ id, type, position: { x: 0, y: 0 }, data: { label } });
const diagram = { nodes: [node('n1', 'c4-person', 'Cliente'), node('n2', 'c4-system', 'Loja Online')], edges: [] };

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
    ...fields,
  };
}

const good = [suggestion({ title: 'Ligue o Cliente à Loja' }), suggestion({ kind: 'improve_text', title: 'Descreva', targetName: 'Loja Online' })];
const bad = [
  suggestion({ kind: 'add_element', elementType: 'c4-container', name: 'API' }),
  suggestion({ kind: 'add_relationship', source: 'Cliente', target: 'Banco' }),
];

const provider = { mode: 'anthropic', generate: jest.fn() };

function answer(suggestions, cost = 0.001, model = 'claude-haiku-5-5') {
  return { ok: true, suggestions, cost, model };
}

describe('AiService (RF16)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test', ANTHROPIC_API_KEY: 'sk-ant-teste' };
    delete process.env.AI_DEMO;
    aiService.resetProviderForTests();
    aiProvider.createAnthropicProvider.mockReturnValue(provider);
    aiProvider.createDemoProvider.mockReturnValue({ ...provider, mode: 'demo' });
    projectService.getProject.mockResolvedValue(project);
    diagramRepository.findAllByProject.mockResolvedValue([]);
    aiUsageRepository.countToday.mockResolvedValue({ suggestion: 0, deep: 0, escalation: 0 });
    aiUsageRepository.reserve.mockImplementation(async (_, kind) => ({ ok: true, id: `reserva-${kind}` }));
    aiUsageRepository.settle.mockResolvedValue();
    aiUsageRepository.release.mockResolvedValue();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getStatus', () => {
    it('deve informar o modo e quantos pedidos restam hoje', async () => {
      aiUsageRepository.countToday.mockResolvedValue({ suggestion: 5, deep: 1, escalation: 2 });

      expect(await aiService.getStatus(userId)).toEqual({
        mode: 'anthropic',
        limits: { suggestion: AI_LIMITS.suggestion, deep: AI_LIMITS.deep },
        remaining: { suggestion: AI_LIMITS.suggestion - 5, deep: AI_LIMITS.deep - 1 },
      });
    });

    it('deve informar desligada sem chave, sem consultar o uso', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      expect(await aiService.getStatus(userId)).toEqual({ mode: 'disabled', limits: expect.any(Object), remaining: null });
      expect(aiUsageRepository.countToday).not.toHaveBeenCalled();
    });
  });

  describe('suggest', () => {
    it('deve devolver as sugestões que passaram pelo motor, registrando o uso e o custo', async () => {
      provider.generate.mockResolvedValue(answer(good, 0.0012));
      aiUsageRepository.countToday.mockResolvedValue({ suggestion: 1, deep: 0, escalation: 0 });

      const result = await aiService.suggest(projectId, userId, 'context', { diagram });

      expect(provider.generate).toHaveBeenCalledTimes(1);
      expect(provider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'fast',
          system: expect.any(String),
          user: expect.stringContaining('Revise o diagrama'),
          context: expect.objectContaining({ level: 'context', project }),
        })
      );
      expect(aiUsageRepository.reserve).toHaveBeenCalledWith(userId, 'suggestion', {
        limit: AI_LIMITS.suggestion,
        budgetUsd: AI_LIMITS.dailyBudgetUsd,
        estimatedCost: AI_TIERS.fast.reservedUsd,
      });
      expect(aiUsageRepository.reserve.mock.invocationCallOrder[0]).toBeLessThan(provider.generate.mock.invocationCallOrder[0]);
      expect(aiUsageRepository.settle).toHaveBeenCalledWith('reserva-suggestion', 0.0012);
      expect(result).toEqual({
        suggestions: [
          expect.objectContaining({ title: 'Ligue o Cliente à Loja', nodeId: null }),
          expect.objectContaining({ kind: 'improve_text', nodeId: 'n2' }),
        ],
        source: 'claude-haiku-5-5',
        escalated: false,
        remaining: { suggestion: AI_LIMITS.suggestion - 1, deep: AI_LIMITS.deep },
      });
    });

    it('deve pedir o ponto de partida quando o nível está vazio, com a descrição informada pelo usuário', async () => {
      provider.generate.mockResolvedValue(answer([suggestion({ kind: 'add_element', elementType: 'c4-person', name: 'Leitor' })]));

      await aiService.suggest(projectId, userId, 'context', {
        diagram: { nodes: [], edges: [] },
        description: '  Loja de livros  ',
      });

      const { user } = provider.generate.mock.calls[0][0];
      expect(user).toMatch(/ponto de partida/);
      expect(user).toContain('Loja de livros');
    });

    it('deve incluir os outros níveis salvos e o que o validador já apontou', async () => {
      diagramRepository.findAllByProject.mockResolvedValue([
        { level: 'container', data: { nodes: [node('c1', 'c4-container', 'API')], edges: [] } },
      ]);
      provider.generate.mockResolvedValue(answer(good));

      await aiService.suggest(projectId, userId, 'context', { diagram });

      const { user } = provider.generate.mock.calls[0][0];
      expect(user).toContain('API (c4-container)');
      expect(user).toMatch(/não tem nenhuma relação/);
    });

    it('deve escalar para o Opus uma vez quando a maioria das sugestões do Haiku é descartada', async () => {
      provider.generate
        .mockResolvedValueOnce(answer([...bad, good[0]], 0.001))
        .mockResolvedValueOnce(answer(good, 0.07, 'claude-opus-5-5'));

      const result = await aiService.suggest(projectId, userId, 'context', { diagram });

      expect(provider.generate).toHaveBeenCalledTimes(2);
      expect(provider.generate.mock.calls[1][0]).toEqual(
        expect.objectContaining({ tier: 'escalation', user: expect.stringMatching(/foram descartadas/) })
      );
      expect(aiUsageRepository.settle).toHaveBeenCalledWith('reserva-suggestion', 0.001);
      expect(aiUsageRepository.reserve).toHaveBeenCalledWith(userId, 'escalation', {
        limit: AI_LIMITS.escalation,
        budgetUsd: AI_LIMITS.dailyBudgetUsd,
        estimatedCost: AI_TIERS.escalation.reservedUsd,
      });
      expect(aiUsageRepository.settle).toHaveBeenCalledWith('reserva-escalation', 0.07);
      expect(result).toEqual(expect.objectContaining({ source: 'claude-opus-5-5', escalated: true }));
      expect(result.suggestions).toHaveLength(2);
    });

    it('deve escalar quando o Haiku falha (recusa, resposta cortada ou erro passageiro)', async () => {
      provider.generate
        .mockResolvedValueOnce({ ok: false, reason: 'refused', cost: 0.0002, model: 'claude-haiku-5-5' })
        .mockResolvedValueOnce(answer(good, 0.07, 'claude-opus-5-5'));

      const result = await aiService.suggest(projectId, userId, 'context', { diagram });

      expect(result.escalated).toBe(true);
      expect(aiUsageRepository.settle).toHaveBeenCalledWith('reserva-suggestion', 0.0002);
    });

    it('deve ficar com o resultado do Haiku quando a escalada também falhar', async () => {
      provider.generate
        .mockResolvedValueOnce(answer([bad[0], good[0], bad[1]]))
        .mockResolvedValueOnce({ ok: false, reason: 'api_error', cost: 0, model: 'claude-opus-5-5' });

      const result = await aiService.suggest(projectId, userId, 'context', { diagram });

      expect(result).toEqual(expect.objectContaining({ source: 'claude-haiku-5-5', escalated: false }));
      expect(result.suggestions).toEqual([expect.objectContaining({ title: 'Ligue o Cliente à Loja' })]);
    });

    it('não deve escalar além do limite diário de escaladas (devolve o que o Haiku tiver)', async () => {
      aiUsageRepository.reserve.mockImplementation(async (_, kind) =>
        kind === 'escalation' ? { ok: false, scope: 'escalation' } : { ok: true, id: 'reserva' }
      );
      provider.generate.mockResolvedValueOnce(answer([bad[0], good[0], bad[1]]));

      const result = await aiService.suggest(projectId, userId, 'context', { diagram });

      expect(provider.generate).toHaveBeenCalledTimes(1);
      expect(result.suggestions).toHaveLength(1);
    });

    it('não deve escalar se o teto do sistema estourar com o gasto do Haiku', async () => {
      aiUsageRepository.reserve.mockImplementation(async (_, kind) =>
        kind === 'escalation' ? { ok: false, scope: 'system' } : { ok: true, id: 'reserva' }
      );
      provider.generate.mockResolvedValueOnce(answer([bad[0], good[0], bad[1]], 0.001));

      await aiService.suggest(projectId, userId, 'context', { diagram });

      expect(provider.generate).toHaveBeenCalledTimes(1);
    });

    it('deve avisar que não foi possível quando nenhuma tentativa deixa sugestão útil', async () => {
      provider.generate
        .mockResolvedValueOnce({ ok: false, reason: 'refused', cost: 0, model: 'claude-haiku-5-5' })
        .mockResolvedValueOnce({ ok: false, reason: 'refused', cost: 0, model: 'claude-opus-5-5' });

      await expect(aiService.suggest(projectId, userId, 'context', { diagram })).rejects.toThrow(AiGenerationError);
    });

    it('deve ir direto ao Opus na análise aprofundada, sem escalada', async () => {
      provider.generate.mockResolvedValueOnce(answer([bad[0], good[0], bad[1]], 0.11, 'claude-opus-5-5'));
      aiUsageRepository.countToday.mockResolvedValue({ suggestion: 0, deep: 1, escalation: 0 });

      const result = await aiService.suggest(projectId, userId, 'context', { diagram, depth: 'deep' });

      expect(provider.generate).toHaveBeenCalledTimes(1);
      expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'deep' }));
      expect(aiUsageRepository.settle).toHaveBeenCalledWith('reserva-deep', 0.11);
      expect(result.remaining).toEqual({ suggestion: AI_LIMITS.suggestion, deep: AI_LIMITS.deep - 1 });
    });

    it('deve recusar além do limite diário do usuário, sem chamar a IA', async () => {
      aiUsageRepository.reserve.mockResolvedValue({ ok: false, scope: 'deep' });

      await expect(aiService.suggest(projectId, userId, 'context', { diagram, depth: 'deep' })).rejects.toThrow(
        expect.objectContaining({ name: 'AiDailyLimitError', scope: 'deep' })
      );
      expect(provider.generate).not.toHaveBeenCalled();
    });

    it('deve pausar a IA de todos ao atingir o teto diário do sistema', async () => {
      aiUsageRepository.reserve.mockResolvedValue({ ok: false, scope: 'system' });

      await expect(aiService.suggest(projectId, userId, 'context', { diagram })).rejects.toThrow(
        expect.objectContaining({ name: 'AiDailyLimitError', scope: 'system' })
      );
      expect(provider.generate).not.toHaveBeenCalled();
    });

    it('deve desfazer a reserva e repassar quando a IA estiver indisponível (chave ou créditos)', async () => {
      provider.generate.mockRejectedValue(new AiUnavailableError());

      await expect(aiService.suggest(projectId, userId, 'context', { diagram })).rejects.toThrow(AiUnavailableError);
      expect(aiUsageRepository.release).toHaveBeenCalledWith('reserva-suggestion');
      expect(aiUsageRepository.settle).not.toHaveBeenCalled();
    });

    it('deve recusar com IA desligada (sem chave), antes de qualquer consulta', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(aiService.suggest(projectId, userId, 'context', { diagram })).rejects.toThrow(AiUnavailableError);
      expect(projectService.getProject).not.toHaveBeenCalled();
    });

    it('deve usar o provedor de demonstração quando pedido fora de produção', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.AI_DEMO = 'true';
      provider.generate.mockResolvedValue(answer(good, 0, 'demo'));

      const result = await aiService.suggest(projectId, userId, 'context', { diagram });

      expect(aiProvider.createDemoProvider).toHaveBeenCalled();
      expect(result.source).toBe('demo');
    });

    it.each([
      ['nível inválido', 'code', { diagram }, InvalidDiagramLevelError],
      ['diagrama malformado', 'context', { diagram: { nodes: 'x' } }, InvalidDiagramDataError],
      ['profundidade desconhecida', 'context', { diagram, depth: 'max' }, InvalidSuggestionRequestError],
      ['descrição que não é texto', 'context', { diagram, description: 42 }, InvalidSuggestionRequestError],
      ['descrição longa demais', 'context', { diagram, description: 'a'.repeat(1001) }, InvalidSuggestionRequestError],
    ])('deve recusar %s antes de chamar a IA', async (_, level, body, ErrorClass) => {
      await expect(aiService.suggest(projectId, userId, level, body)).rejects.toThrow(ErrorClass);
      expect(provider.generate).not.toHaveBeenCalled();
    });

    it('deve exigir o diagrama no corpo do pedido', async () => {
      await expect(aiService.suggest(projectId, userId, 'context', {})).rejects.toThrow(InvalidDiagramDataError);
    });

    it('deve recusar além do limite de sugestões do usuário', async () => {
      aiUsageRepository.reserve.mockResolvedValue({ ok: false, scope: 'suggestion' });

      await expect(aiService.suggest(projectId, userId, 'context', { diagram })).rejects.toThrow(AiDailyLimitError);
    });
  });
});
