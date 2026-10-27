const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { ProjectNotFoundError } = require('../../src/errors/project.errors');

const NOT_FOUND_MESSAGE = new ProjectNotFoundError().message;

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email`,
    ['Diagram E2E User', email, 'hashed_password_123']
  );
  return result.rows[0];
}

async function insertProject(userId, name) {
  const result = await pool.query(`INSERT INTO projects (user_id, name) VALUES ($1, $2) RETURNING id`, [userId, name]);
  return result.rows[0].id;
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const contextData = {
  nodes: [
    { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' }, selected: true },
    { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja Online' } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em' }],
};

describe('Rotas de diagramas /api/projects/:projectId/diagrams', () => {
  const ownerEmail = 'owner.diagram.e2e@example.com';
  const otherEmail = 'other.diagram.e2e@example.com';
  let owner;
  let otherUser;
  let auth;
  let projectId;
  let otherProjectId;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[ownerEmail, otherEmail]]);
    owner = await insertUser(ownerEmail);
    otherUser = await insertUser(otherEmail);
    auth = `Bearer ${tokenFor(owner)}`;
  });

  beforeEach(async () => {
    projectId = await insertProject(owner.id, 'Loja Online');
    otherProjectId = await insertProject(otherUser.id, 'Projeto alheio');
  });

  afterEach(async () => {
    await pool.query('DELETE FROM projects WHERE user_id = ANY($1)', [[owner.id, otherUser.id]]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[owner.id, otherUser.id]]);
    await pool.end();
  });

  const diagramsUrl = (id) => `/api/projects/${id}/diagrams`;

  describe('autenticação (RN01)', () => {
    it.each([
      ['get', ''],
      ['put', '/context'],
      ['post', '/container/validate'],
    ])('deve retornar 401 em %s sem token', async (method, suffix) => {
      const response = await request(app)[method](`${diagramsUrl(projectId)}${suffix}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET (carregar diagramas do projeto)', () => {
    it('deve retornar lista vazia para projeto sem diagramas salvos', async () => {
      const response = await request(app).get(diagramsUrl(projectId)).set('Authorization', auth);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('deve retornar 404 para projeto de outro usuário (RN02)', async () => {
      const response = await request(app).get(diagramsUrl(otherProjectId)).set('Authorization', auth);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(NOT_FOUND_MESSAGE);
    });
  });

  describe('PUT /:level (salvar o diagrama do nível)', () => {
    it('deve salvar o documento normalizado e devolvê-lo também na listagem', async () => {
      const response = await request(app)
        .put(`${diagramsUrl(projectId)}/context`)
        .set('Authorization', auth)
        .send(contextData);

      expect(response.status).toBe(200);
      expect(response.body.level).toBe('context');
      expect(response.body.data.nodes[0]).not.toHaveProperty('selected');

      const list = await request(app).get(diagramsUrl(projectId)).set('Authorization', auth);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].data.edges[0].label).toBe('Compra em');
    });

    it('deve retornar 204 e remover o nível quando o canvas for salvo vazio (RN10)', async () => {
      await request(app).put(`${diagramsUrl(projectId)}/context`).set('Authorization', auth).send(contextData);

      const response = await request(app)
        .put(`${diagramsUrl(projectId)}/context`)
        .set('Authorization', auth)
        .send({ nodes: [], edges: [] });

      expect(response.status).toBe(204);
      const list = await request(app).get(diagramsUrl(projectId)).set('Authorization', auth);
      expect(list.body).toEqual([]);
    });

    it('deve retornar 400 para nível inválido', async () => {
      const response = await request(app)
        .put(`${diagramsUrl(projectId)}/code`)
        .set('Authorization', auth)
        .send(contextData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Nível "code" inválido. Use "context", "container" ou "component".');
    });

    it('deve retornar 400 com a mensagem do problema para documento inválido', async () => {
      const response = await request(app)
        .put(`${diagramsUrl(projectId)}/context`)
        .set('Authorization', auth)
        .send({ nodes: [{ ...contextData.nodes[0], type: 'c4-banana' }], edges: [] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Elemento "n1": tipo "c4-banana" não é um tipo C4 suportado.');
    });

    it('deve retornar 404 e não gravar nada em projeto de outro usuário (RN02)', async () => {
      const response = await request(app)
        .put(`${diagramsUrl(otherProjectId)}/context`)
        .set('Authorization', auth)
        .send(contextData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(NOT_FOUND_MESSAGE);
      const stored = await pool.query('SELECT id FROM diagrams WHERE project_id = $1', [otherProjectId]);
      expect(stored.rows).toHaveLength(0);
    });

    it('deve retornar 404 quando o id do projeto não for UUID', async () => {
      const response = await request(app).put(`${diagramsUrl('abc')}/context`).set('Authorization', auth).send(contextData);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(NOT_FOUND_MESSAGE);
    });

    it('deve aceitar um diagrama grande (200 elementos com descrição), acima do limite padrão de 100 KB', async () => {
      const nodes = Array.from({ length: 200 }, (_, i) => ({
        id: `n${i}`,
        type: 'c4-container',
        position: { x: i, y: i },
        data: { label: `Container ${i}`, description: 'd'.repeat(900), technology: 'Node.js' },
      }));

      const response = await request(app)
        .put(`${diagramsUrl(projectId)}/container`)
        .set('Authorization', auth)
        .send({ nodes, edges: [] });

      expect(response.status).toBe(200);
      expect(response.body.data.nodes).toHaveLength(200);
    });
  });

  describe('POST /:level/validate (motor de validação C4 — RF17)', () => {
    const containerData = {
      nodes: [
        { id: 'p1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Administrador', description: 'Gerencia' } },
        { id: 'c1', type: 'c4-container', position: { x: 300, y: 0 }, data: { label: 'API', description: 'Regras', technology: 'Node.js' } },
      ],
      edges: [{ id: 'e1', source: 'p1', target: 'c1', label: 'Usa', technology: 'HTTPS' }],
    };

    it('deve devolver erros e avisos do estado enviado, comparando com o nível acima salvo, sem gravar nada', async () => {
      await request(app).put(`${diagramsUrl(projectId)}/context`).set('Authorization', auth).send(contextData);

      const response = await request(app)
        .post(`${diagramsUrl(projectId)}/container/validate`)
        .set('Authorization', auth)
        .send(containerData);

      expect(response.status).toBe(200);
      expect(response.body.issues).toContainEqual({
        code: 'MISSING_IN_PARENT_LEVEL',
        severity: 'warning',
        nodeId: 'p1',
        message: '"Administrador" (Pessoa) não aparece no diagrama de Contexto.',
      });
      const saved = await pool.query('SELECT level FROM diagrams WHERE project_id = $1', [projectId]);
      expect(saved.rows.map((row) => row.level)).toEqual(['context']);
    });

    it('deve responder 404 para projeto de outro usuário (RN02)', async () => {
      const response = await request(app)
        .post(`${diagramsUrl(otherProjectId)}/container/validate`)
        .set('Authorization', auth)
        .send(containerData);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: NOT_FOUND_MESSAGE });
    });

    it('deve responder 400 para nível inválido', async () => {
      const response = await request(app)
        .post(`${diagramsUrl(projectId)}/code/validate`)
        .set('Authorization', auth)
        .send(containerData);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT com erro do motor de validação', () => {
    it('deve responder 400 explicando o elemento fora do nível (RN08), sem gravar', async () => {
      const data = { nodes: [{ id: 'k1', type: 'c4-component', position: { x: 0, y: 0 }, data: { label: 'Controlador' } }], edges: [] };

      const response = await request(app).put(`${diagramsUrl(projectId)}/context`).set('Authorization', auth).send(data);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: '"Controlador" (Componente) não pertence ao diagrama de Contexto.' });
      const saved = await pool.query('SELECT 1 FROM diagrams WHERE project_id = $1', [projectId]);
      expect(saved.rowCount).toBe(0);
    });
  });
});
