const aiUsageRepository = require('../repositories/aiUsage.repository');
const diagramRepository = require('../repositories/diagram.repository');
const projectService = require('./project.service');
const aiProvider = require('./ai.provider');
const c4Validation = require('./c4.validation');
const { normalizeDiagramData } = require('./diagram.validation');
const { checkSuggestions } = require('./ai.suggestionCheck');
const { SYSTEM_PROMPT, buildUserMessage } = require('./ai.prompt');
const { AI_LIMITS, resolveAiMode } = require('../config/ai');
const { LEVELS } = require('../domain/c4');
const { InvalidDiagramLevelError } = require('../errors/diagram.errors');
const {
  AiUnavailableError,
  AiDailyLimitError,
  AiGenerationError,
  InvalidSuggestionRequestError,
} = require('../errors/ai.errors');

const DEPTHS = ['standard', 'deep'];
// Descrição do sistema para o ponto de partida (a do projeto tem só 150 caracteres)
const DESCRIPTION_MAX_LENGTH = 1000;
const PUBLIC_LIMITS = { suggestion: AI_LIMITS.suggestion, deep: AI_LIMITS.deep };

// O provedor é criado uma vez por modo e chave: trocar o secret no deploy (variável nova) já liga a IA
let cached = { key: null, provider: null };

function providerFor(mode) {
  const key = `${mode}:${process.env.ANTHROPIC_API_KEY ?? ''}`;
  if (cached.key !== key) {
    const provider =
      mode === 'anthropic'
        ? aiProvider.createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY.trim() })
        : aiProvider.createDemoProvider();
    cached = { key, provider };
  }
  return cached.provider;
}

function resetProviderForTests() {
  cached = { key: null, provider: null };
}

function remainingFrom(counts) {
  return {
    suggestion: Math.max(0, AI_LIMITS.suggestion - counts.suggestion),
    deep: Math.max(0, AI_LIMITS.deep - counts.deep),
  };
}

async function getStatus(userId) {
  const mode = resolveAiMode();
  if (mode === 'disabled') return { mode, limits: PUBLIC_LIMITS, remaining: null };
  return { mode, limits: PUBLIC_LIMITS, remaining: remainingFrom(await aiUsageRepository.countToday(userId)) };
}

function parseRequest(level, body) {
  if (!LEVELS.includes(level)) throw new InvalidDiagramLevelError(level);

  const depth = body?.depth ?? 'standard';
  if (!DEPTHS.includes(depth)) throw new InvalidSuggestionRequestError('Tipo de pedido inválido. Use "standard" ou "deep".');

  let description = null;
  if (body?.description !== undefined && body?.description !== null) {
    if (typeof body.description !== 'string') throw new InvalidSuggestionRequestError('A descrição do sistema deve ser um texto.');
    description = body.description.trim() || null;
    if (description?.length > DESCRIPTION_MAX_LENGTH) {
      throw new InvalidSuggestionRequestError(`A descrição do sistema pode ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`);
    }
  }

  return { depth, description, data: normalizeDiagramData(body?.diagram) };
}

// Resposta fraca: nada útil sobrou, ou o motor descartou mais da metade
function isWeak(result) {
  if (!result) return true;
  const total = result.kept.length + result.discarded.length;
  return result.kept.length === 0 || result.discarded.length > total / 2;
}

// Nota: RF16 — sugestões sob pedido (nunca automáticas; RN12: só orientam, nada é aplicado no diagrama).
// 1. Limites: do usuário (por tipo de pedido) e o teto de gasto do sistema no dia.
// 2. Haiku (ou Opus direto na "Análise aprofundada"); o motor do RF17 confere cada sugestão.
// 3. Resposta fraca do Haiku → uma única escalada para o Opus, com o que foi descartado; se ela também falhar,
//    fica o que o Haiku tinha de válido. Cada chamada é registrada com o custo informado pela API.
async function suggest(projectId, userId, level, body) {
  const mode = resolveAiMode();
  if (mode === 'disabled') throw new AiUnavailableError();

  const { depth, description, data } = parseRequest(level, body);
  const project = await projectService.getProject(projectId, userId);

  const kind = depth === 'deep' ? 'deep' : 'suggestion';
  const [counts, spent] = await Promise.all([aiUsageRepository.countToday(userId), aiUsageRepository.costToday()]);
  if (counts[kind] >= AI_LIMITS[kind]) throw new AiDailyLimitError(kind);
  if (spent >= AI_LIMITS.dailyBudgetUsd) throw new AiDailyLimitError('system');

  // Os outros níveis salvos dão o contexto entre níveis; o validador conta o que já apontou, para a IA não repetir
  const saved = await diagramRepository.findAllByProject(projectId, userId);
  const otherLevels = Object.fromEntries(saved.filter((diagram) => diagram.level !== level).map((diagram) => [diagram.level, diagram.data]));
  const knownIssues = c4Validation.validateDiagram(level, { ...otherLevels, [level]: data }).map((issue) => issue.message);

  const promptInput = { project, level, data, otherLevels, knownIssues, description, depth };
  const context = { level, data, project, description };
  const provider = providerFor(mode);

  const first = await provider.generate({ tier: kind === 'deep' ? 'deep' : 'fast', system: SYSTEM_PROMPT, user: buildUserMessage(promptInput), context });
  await aiUsageRepository.record(userId, kind, first.cost);
  let best = first.ok ? { ...checkSuggestions(level, data, first.suggestions), source: first.model, escalated: false } : null;

  const canEscalate =
    kind === 'suggestion' &&
    isWeak(best) &&
    counts.escalation < AI_LIMITS.escalation &&
    spent + first.cost < AI_LIMITS.dailyBudgetUsd;
  if (canEscalate) {
    const second = await provider.generate({
      tier: 'escalation',
      system: SYSTEM_PROMPT,
      user: buildUserMessage({ ...promptInput, discarded: best?.discarded ?? [] }),
      context,
    });
    await aiUsageRepository.record(userId, 'escalation', second.cost);

    if (second.ok) {
      const checked = checkSuggestions(level, data, second.suggestions);
      if (checked.kept.length > 0) best = { ...checked, source: second.model, escalated: true };
    }
  }

  if (!best || best.kept.length === 0) throw new AiGenerationError();

  return {
    suggestions: best.kept,
    source: best.source,
    escalated: best.escalated,
    remaining: remainingFrom({ ...counts, [kind]: counts[kind] + 1 }),
  };
}

module.exports = { getStatus, suggest, resetProviderForTests };
