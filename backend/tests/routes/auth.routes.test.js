const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/register', () => {
  const testEmail = 'e2e.register@example.com';

  afterEach(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
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

describe('POST /api/auth/login', () => {
  const loginTestEmail = 'e2e.login@example.com';
  const loginPassword = 'Senha@12345';

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Test User',
      email: loginTestEmail,
      password: loginPassword,
    });
  });

  afterEach(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [loginTestEmail]);
  });

  it('deve autenticar com sucesso e retornar token', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: loginTestEmail,
      password: loginPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(loginTestEmail);
    expect(response.body.user).not.toHaveProperty('password_hash');
  });

  it('deve retornar 401 para senha incorreta', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: loginTestEmail,
      password: 'SenhaErrada@123',
    });

    expect(response.status).toBe(401);
  });

  it('deve retornar 401 para e-mail não cadastrado', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'naoexiste@example.com',
      password: loginPassword,
    });

    expect(response.status).toBe(401);
  });

  it('deve bloquear a conta após 10 tentativas incorretas e retornar 423', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({
        email: loginTestEmail,
        password: 'SenhaErrada@123',
      });
    }

    const response = await request(app).post('/api/auth/login').send({
      email: loginTestEmail,
      password: loginPassword,
    });

    expect(response.status).toBe(423);
    expect(response.body).toHaveProperty('minutesRemaining');
  });
});