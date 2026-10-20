const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('GET /api/health', () => {
  const originalVersion = process.env.APP_VERSION;

  afterEach(() => {
    if (originalVersion === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = originalVersion;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deve informar que a API e o banco estão no ar', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'connected' });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('deve informar a versão em execução, para o deploy confirmar que a nova versão subiu', async () => {
    process.env.APP_VERSION = 'abc1234';

    const response = await request(app).get('/api/health');

    expect(response.body.version).toBe('abc1234');
  });

  it('deve usar "dev" como versão fora da imagem de produção', async () => {
    delete process.env.APP_VERSION;

    const response = await request(app).get('/api/health');

    expect(response.body.version).toBe('dev');
  });
});
