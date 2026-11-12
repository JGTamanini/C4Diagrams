const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

async function insertUser(email, name) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email`,
    [name, email, 'hashed_password_123']
  );
  return result.rows[0];
}

const bearer = (user) => `Bearer ${jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;

describe('Link de visualização: /api/projects/:id/share e /api/shared/:token', () => {
  const ownerEmail = 'owner.share.e2e@example.com';
  const viewerEmail = 'viewer.share.e2e@example.com';
  let owner;
  let viewer;
  let projectId;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[ownerEmail, viewerEmail]]);
    owner = await insertUser(ownerEmail, 'Ana Dona');
    viewer = await insertUser(viewerEmail, 'Professor');
  });

  beforeEach(async () => {
    const result = await pool.query(`INSERT INTO projects (user_id, name) VALUES ($1, 'Loja Online') RETURNING id`, [owner.id]);
    projectId = result.rows[0].id;
    await pool.query(`INSERT INTO diagrams (project_id, level, data) VALUES ($1, 'context', $2)`, [
      projectId,
      { nodes: [{ id: 'n1', type: 'c4-system', position: { x: 0, y: 0 }, data: { label: 'Loja' } }], edges: [] },
    ]);
  });

  afterEach(async () => {
    await pool.query('DELETE FROM projects WHERE user_id = ANY($1)', [[owner.id, viewer.id]]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[owner.id, viewer.id]]);
    await pool.end();
  });

  const shareUrl = () => `/api/projects/${projectId}/share`;

  it('deve exigir login para criar o link e para abri-lo', async () => {
    expect((await request(app).post(shareUrl())).status).toBe(401);
    expect((await request(app).get(`/api/shared/${'A'.repeat(32)}`)).status).toBe(401);
  });

  it('dono cria o link; outra pessoa logada abre o projeto só para ver; o dono revoga e o link deixa de abrir', async () => {
    expect((await request(app).get(shareUrl()).set('Authorization', bearer(owner))).body).toEqual({ token: null });

    const created = await request(app).post(shareUrl()).set('Authorization', bearer(owner));
    expect(created.status).toBe(201);
    const { token } = created.body;
    expect((await request(app).get(shareUrl()).set('Authorization', bearer(owner))).body).toEqual({ token });

    const opened = await request(app).get(`/api/shared/${token}`).set('Authorization', bearer(viewer));
    expect(opened.status).toBe(200);
    expect(opened.body).toEqual({
      name: 'Loja Online',
      description: null,
      ownerName: 'Ana Dona',
      updatedAt: expect.any(String),
      diagrams: [expect.objectContaining({ level: 'context' })],
    });

    expect((await request(app).delete(shareUrl()).set('Authorization', bearer(owner))).status).toBe(204);
    const revoked = await request(app).get(`/api/shared/${token}`).set('Authorization', bearer(viewer));
    expect(revoked.status).toBe(404);
    expect(revoked.body.message).toMatch(/inválido ou foi revogado/);
  });

  it('não deve deixar outra pessoa ver, criar ou revogar o link do projeto (RN02)', async () => {
    for (const method of ['get', 'post', 'delete']) {
      expect((await request(app)[method](shareUrl()).set('Authorization', bearer(viewer))).status).toBe(404);
    }
  });

  it('deve invalidar o link anterior ao gerar um novo', async () => {
    const first = (await request(app).post(shareUrl()).set('Authorization', bearer(owner))).body.token;
    const second = (await request(app).post(shareUrl()).set('Authorization', bearer(owner))).body.token;

    expect((await request(app).get(`/api/shared/${first}`).set('Authorization', bearer(viewer))).status).toBe(404);
    expect((await request(app).get(`/api/shared/${second}`).set('Authorization', bearer(viewer))).status).toBe(200);
  });
});
