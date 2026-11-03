// Nota: RF16 — parâmetros da assistência por IA (Anthropic), num lugar só para a medição com diagramas reais poder
// ajustá-los sem mexer na lógica. Arquitetura aprovada: Haiku em todo pedido; o motor do RF17 confere cada sugestão;
// Opus só na escalada automática (resposta fraca do Haiku) e na "Análise aprofundada" pedida pelo usuário.

const AI_MODELS = {
  fast: 'claude-haiku-5-5',
  deep: 'claude-opus-5-5',
};

// Cada nível de pedido: modelo, esforço de raciocínio, teto de tokens da resposta e tempo máximo (RNF03 revisto:
// alvo de ~10 s no Haiku). fallback: a própria API refaz no modelo alternativo uma recusa dos filtros de segurança
// do Opus (ex.: diagrama de um sistema de segurança barrado por engano)
const AI_TIERS = {
  fast: { model: AI_MODELS.fast, effort: 'low', maxTokens: 4_000, timeoutMs: 30_000, fallback: false },
  escalation: { model: AI_MODELS.deep, effort: 'medium', maxTokens: 8_000, timeoutMs: 90_000, fallback: true },
  deep: { model: AI_MODELS.deep, effort: 'medium', maxTokens: 12_000, timeoutMs: 90_000, fallback: true },
};

// Limites por usuário por dia (fuso de Brasília) e teto de gasto do sistema inteiro por dia, em dólares
const AI_LIMITS = {
  suggestion: 20,
  deep: 3,
  escalation: 5,
  dailyBudgetUsd: 1,
};

// Preço por milhão de tokens (entrada / saída). Modelo fora da tabela (o fallback escolhido pela API) é estimado
// com um preço acima do Opus 5.5, para o teto nunca subestimar o gasto
const PRICES_PER_MILLION = {
  [AI_MODELS.fast]: { input: 0.1, output: 0.5 },
  [AI_MODELS.deep]: { input: 4, output: 20 },
};
const UNKNOWN_MODEL_PRICE = { input: 5, output: 25 };

function attemptCost(model, usage) {
  const price = PRICES_PER_MILLION[model] ?? UNKNOWN_MODEL_PRICE;
  return ((usage.input_tokens ?? 0) * price.input + (usage.output_tokens ?? 0) * price.output) / 1_000_000;
}

// Custo de uma resposta a partir do uso que a própria API informa. Com fallback, a API lista cada tentativa
// (iterations), cada uma com o modelo que rodou
function costOf(model, usage) {
  if (!usage) return 0;
  if (Array.isArray(usage.iterations) && usage.iterations.length > 0) {
    return usage.iterations.reduce((total, attempt) => total + attemptCost(attempt.model ?? model, attempt), 0);
  }
  return attemptCost(model, usage);
}

// anthropic: com a chave (o deploy passa o secret; sem ele, a variável chega vazia). demo: sugestões de exemplo,
// só fora de produção. disabled: a aba de sugestões avisa que está indisponível; o resto do sistema segue normal
function resolveAiMode(env = process.env) {
  if (env.ANTHROPIC_API_KEY?.trim()) return 'anthropic';
  if (env.AI_DEMO === 'true' && env.NODE_ENV !== 'production') return 'demo';
  return 'disabled';
}

module.exports = { AI_MODELS, AI_TIERS, AI_LIMITS, costOf, resolveAiMode };
