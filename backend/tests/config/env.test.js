const { validateEnv, MissingEnvError } = require('../../src/config/env');

const STRONG_SECRET = 'a'.repeat(32);

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@host:5432/db',
  JWT_SECRET: STRONG_SECRET,
  JWT_EXPIRES_IN: '7d',
  RESEND_API_KEY: 're_123',
  EMAIL_FROM: 'contato@exemplo.com',
  FRONTEND_URL: 'https://exemplo.com',
};

describe('validateEnv', () => {
  it('deve aceitar um ambiente de produção completo', () => {
    expect(() => validateEnv(productionEnv)).not.toThrow();
  });

  it('deve listar todas as variáveis obrigatórias que faltam em produção', () => {
    const { JWT_SECRET, RESEND_API_KEY, ...incomplete } = productionEnv;

    expect(() => validateEnv(incomplete)).toThrow(MissingEnvError);
    expect(() => validateEnv(incomplete)).toThrow('Variáveis de ambiente obrigatórias ausentes: JWT_SECRET, RESEND_API_KEY');
  });

  it('deve tratar variável vazia como ausente', () => {
    expect(() => validateEnv({ ...productionEnv, DATABASE_URL: '  ' })).toThrow('DATABASE_URL');
  });

  it('deve recusar um JWT_SECRET fraco em produção', () => {
    expect(() => validateEnv({ ...productionEnv, JWT_SECRET: 'curto' })).toThrow(
      'JWT_SECRET deve ter ao menos 32 caracteres em produção.'
    );
  });

  it('deve ler process.env quando chamado sem argumentos (como no server.js)', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it('não deve exigir nada fora de produção (desenvolvimento e testes)', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => validateEnv({})).not.toThrow();
  });
});
