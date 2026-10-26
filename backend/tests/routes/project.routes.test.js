const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { ProjectNotFoundError } = require('../../src/errors/project.errors');

const NOT_FOUND_MESSAGE = new ProjectNotFoundError().message;

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email`,
    ['Project E2E User', email, 'hashed_password_123']
  );
  return result.rows[0];
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function insertProject(userId, name) {
  const result = await pool.query(
    `INSERT INTO projects (user_id, name) VALUES ($1, $2) RETURNING id, name`,
    [userId, name]
  );
  return result.rows[0];
}

describe('Rotas de projetos /api/projects', () => {
  const ownerEmail = 'owner.project.e2e@example.com';
  const otherEmail = 'other.project.e2e@example.com';
  let owner;
  let otherUser;
  let auth;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[ownerEmail, otherEmail]]);
    owner = await insertUser(ownerEmail);
    otherUser = await insertUser(otherEmail);
    auth = `Bearer ${tokenFor(owner)}`;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM projects WHERE user_id = ANY($1)', [[owner.id, otherUser.id]]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[owner.id, otherUser.id]]);
    await pool.end();
  });

  describe('autenticação (RN01)', () => {
    const anyId = '00000000-0000-4000-8000-000000000000';

    it.each([
      ['post', '/api/projects'],
      ['get', '/api/projects'],
      ['get', `/api/projects/${anyId}`],
      ['patch', `/api/projects/${anyId}`],
      ['delete', `/api/projects/${anyId}`],
    ])('deve retornar 401 em %s %s sem token', async (method, url) => {
      const response = await request(app)[method](url);

      expect(response.status).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/projects (RF04)', () => {
    it('deve criar o projeto e retornar 201 com os dados públicos', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', auth)
        .send({ name: 'Sistema de Pedidos', description: 'Arquitetura do e-commerce' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Sistema de Pedidos');
      expect(response.body.description).toBe('Arquitetura do e-commerce');
      expect(response.body).not.toHaveProperty('user_id');
    });

    it('deve vincular o projeto ao usuário do token, ignorando user_id enviado no corpo', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', auth)
        .send({ name: 'Tentativa', user_id: otherUser.id });

      const raw = await pool.query('SELECT user_id FROM projects WHERE id = $1', [response.body.id]);
      expect(raw.rows[0].user_id).toBe(owner.id);
    });

    it('deve retornar 400 quando o nome não for informado (RN04)', async () => {
      const response = await request(app).post('/api/projects').set('Authorization', auth).send({ description: 'x' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('deve retornar 400 quando o nome passar de 255 caracteres', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', auth)
        .send({ name: 'a'.repeat(256) });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/projects (RF07)', () => {
    it('deve listar apenas os projetos do usuário autenticado', async () => {
      const mine = await insertProject(owner.id, 'Meu projeto');
      await insertProject(otherUser.id, 'Projeto alheio');

      const response = await request(app).get('/api/projects').set('Authorization', auth);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(mine.id);
    });
  });

  describe('GET /api/projects/:id (RF07)', () => {
    it('deve retornar 200 com o projeto do usuário', async () => {
      const mine = await insertProject(owner.id, 'Meu projeto');

      const response = await request(app).get(`/api/projects/${mine.id}`).set('Authorization', auth);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mine.id);
      expect(response.body.name).toBe('Meu projeto');
    });

    it('deve retornar 404 para projeto de outro usuário (RN02)', async () => {
      const theirs = await insertProject(otherUser.id, 'Projeto alheio');

      const response = await request(app).get(`/api/projects/${theirs.id}`).set('Authorization', auth);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(NOT_FOUND_MESSAGE);
      });

    it('deve retornar 404 quando o id não for um UUID', async () => {
      const response = await request(app).get('/api/projects/abc').set('Authorization', auth);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(NOT_FOUND_MESSAGE);
    });
  });

  describe('PATCH /api/projects/:id (RF05)', () => {
    it('deve atualizar o projeto e retornar 200', async () => {
      const mine = await insertProject(owner.id, 'Original');

      const response = await request(app)
        .patch(`/api/projects/${mine.id}`)
        .set('Authorization', auth)
        .send({ name: 'Editado', description: 'Nova descrição' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Editado');
      expect(response.body.description).toBe('Nova descrição');
    });

    it('deve atualizar apenas os campos enviados, mantendo os demais', async () => {
      const mine = await insertProject(owner.id, 'Original');

      const response = await request(app)
        .patch(`/api/projects/${mine.id}`)
        .set('Authorization', auth)
        .send({ description: 'Só a descrição' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Original');
      expect(response.body.description).toBe('Só a descrição');
    });

    it('deve retornar 400 quando o nome for vazio (RN04)', async () => {
      const mine = await insertProject(owner.id, 'Original');

      const response = await request(app).patch(`/api/projects/${mine.id}`).set('Authorization', auth).send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 quando nenhum campo for enviado', async () => {
      const mine = await insertProject(owner.id, 'Original');

      const response = await request(app).patch(`/api/projects/${mine.id}`).set('Authorization', auth).send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('deve retornar 404 e não alterar o projeto de outro usuário (RN02)', async () => {
      const theirs = await insertProject(otherUser.id, 'Projeto alheio');

      const response = await request(app)
        .patch(`/api/projects/${theirs.id}`)
        .set('Authorization', auth)
        .send({ name: 'Invadido' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(NOT_FOUND_MESSAGE);
      const raw = await pool.query('SELECT name FROM projects WHERE id = $1', [theirs.id]);
      expect(raw.rows[0].name).toBe('Projeto alheio');
    });
  });

  describe('DELETE /api/projects/:id (RF06)', () => {
    it('deve excluir o projeto e retornar 204 sem corpo', async () => {
      const mine = await insertProject(owner.id, 'Para excluir');

      const response = await request(app).delete(`/api/projects/${mine.id}`).set('Authorization', auth);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      const after = await request(app).get(`/api/projects/${mine.id}`).set('Authorization', auth);
      expect(after.status).toBe(404);
      expect(after.body.message).toBe(NOT_FOUND_MESSAGE);
    });

    it('deve retornar 404 e manter o projeto de outro usuário (RN02)', async () => {
      const theirs = await insertProject(otherUser.id, 'Projeto alheio');

      const response = await request(app).delete(`/api/projects/${theirs.id}`).set('Authorization', auth);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(NOT_FOUND_MESSAGE);
      const raw = await pool.query('SELECT id FROM projects WHERE id = $1', [theirs.id]);
      expect(raw.rows).toHaveLength(1);
    });
  });
});
