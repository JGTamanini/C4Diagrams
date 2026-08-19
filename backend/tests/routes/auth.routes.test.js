const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

describe('POST /api/auth/register', () => {
  const testEmail = 'e2e.register@example.com';

  afterEach(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deve registrar um usuário e retornar 201 com os dados públicos', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'E2E Test User',
        email: testEmail,
        password: 'Senha@12345',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(testEmail);
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password_hash');
  });

  it('deve retornar 400 quando a senha for muito curta', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'E2E Test User',
        email: testEmail,
        password: '123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  it('deve retornar 409 quando o e-mail já estiver cadastrado', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'E2E Test User',
      email: testEmail,
      password: 'Senha@12345',
    });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Another Name',
      email: testEmail,
      password: 'OutraSenha@123',
    });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('message');
  });
});