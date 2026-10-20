// Nota: em produção o servidor nem sobe sem estas variáveis — falha na inicialização, com a lista do que falta,
// em vez de quebrar no primeiro login ou e-mail enviado
const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'FRONTEND_URL',
];

// HS256 com segredo curto pode ser quebrado por força bruta: 32 caracteres = 256 bits
const JWT_SECRET_MIN_LENGTH = 32;

class MissingEnvError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MissingEnvError';
  }
}

function validateEnv(env = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new MissingEnvError(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  }

  if (env.JWT_SECRET.length < JWT_SECRET_MIN_LENGTH) {
    throw new MissingEnvError(`JWT_SECRET deve ter ao menos ${JWT_SECRET_MIN_LENGTH} caracteres em produção.`);
  }
}

module.exports = { validateEnv, MissingEnvError };
