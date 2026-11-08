const { AI_LIMITS } = require('../config/ai');

// Sem chave, sem créditos ou chave sem permissão: o detalhe vai para o log, o usuário vê só que está indisponível
class AiUnavailableError extends Error {
  constructor() {
    super('As sugestões da IA estão indisponíveis no momento.');
    this.name = 'AiUnavailableError';
  }
}

const LIMIT_MESSAGES = {
  suggestion: `Você usou os ${AI_LIMITS.suggestion} pedidos de sugestões de hoje. Volte amanhã.`,
  deep: `Você usou as ${AI_LIMITS.deep} análises aprofundadas de hoje. Volte amanhã.`,
  system: 'A assistência por IA atingiu o limite de uso de hoje e volta amanhã.',
};

class AiDailyLimitError extends Error {
  constructor(scope) {
    super(LIMIT_MESSAGES[scope]);
    this.name = 'AiDailyLimitError';
    this.scope = scope;
  }
}

class AiGenerationError extends Error {
  constructor() {
    super('Não foi possível gerar sugestões agora. Tente de novo em instantes.');
    this.name = 'AiGenerationError';
  }
}

class InvalidSuggestionRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidSuggestionRequestError';
  }
}

module.exports = { AiUnavailableError, AiDailyLimitError, AiGenerationError, InvalidSuggestionRequestError };
