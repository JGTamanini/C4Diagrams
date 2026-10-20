const { buildSslConfig, pool } = require('../../src/config/database');

describe('buildSslConfig', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('deve exigir SSL validando o certificado do servidor quando DATABASE_SSL=true', () => {
    expect(buildSslConfig({ DATABASE_SSL: 'true' })).toEqual({ rejectUnauthorized: true });
  });

  it.each([['false'], [undefined], ['']])('deve desligar SSL quando DATABASE_SSL=%s (banco local e CI)', (value) => {
    expect(buildSslConfig({ DATABASE_SSL: value })).toBe(false);
  });

  it('não deve ligar SSL só por estar em produção — a decisão é explícita', () => {
    expect(buildSslConfig({ NODE_ENV: 'production' })).toBe(false);
  });
});
