const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email`,
    ['Import E2E User', email, 'hashed_password_123']
  );
  return result.rows[0];
}

const projectFile = {
  format: 'c4diagrams',
  version: 1,
  project: { name: 'Loja Online (importada)', description: 'E-commerce' },
  diagrams: {
    context: {
      nodes: [
        { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
        { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja Online' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em' }],
    },
  },
};

describe('POST /api/projects/import (RF21 e RF15)', () => {
  const email = 'owner.import.e2e@example.com';
  let owner;
  let auth;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    owner = await insertUser(email);
    auth = `Bearer ${jwt.sign({ id: owner.id, email: owner.email }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM projects WHERE user_id = $1', [owner.id]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [owner.id]);
    await pool.end();
  });

  it('deve exigir login', async () => {
    expect((await request(app).post('/api/projects/import').send(projectFile)).status).toBe(401);
  });

  it('deve criar um projeto novo do usuário com os diagramas do arquivo', async () => {
    const response = await request(app).post('/api/projects/import').set('Authorization', auth).send(projectFile);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ name: 'Loja Online (importada)', description: 'E-commerce' }));

    const diagrams = await request(app).get(`/api/projects/${response.body.id}/diagrams`).set('Authorization', auth);
    expect(diagrams.body).toEqual([expect.objectContaining({ level: 'context', data: projectFile.diagrams.context })]);
  });

  it('deve responder 400 com o motivo para arquivo inválido, sem criar nada', async () => {
    const response = await request(app)
      .post('/api/projects/import')
      .set('Authorization', auth)
      .send({ ...projectFile, format: 'outro' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/não é um projeto do C4Diagrams/);
    const { rows } = await pool.query('SELECT id FROM projects WHERE user_id = $1', [owner.id]);
    expect(rows).toEqual([]);
  });
});
