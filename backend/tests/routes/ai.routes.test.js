const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');
const { AI_LIMITS } = require('../../src/config/ai');
const aiService = require('../../src/services/ai.service');

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email`,
    ['AI E2E User', email, 'hashed_password_123']
  );
  return result.rows[0];
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const diagram = {
  nodes: [
    { id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente', description: 'Compra livros' } },
    { id: 'n2', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja Online' } },
  ],
  edges: [],
};

// Ponta a ponta no modo demonstração: rota → serviço → motor → banco, sem chamar a Anthropic
describe('Rotas da IA (RF16)', () => {
  const email = 'owner.ai.e2e@example.com';
  const otherEmail = 'other.ai.e2e@example.com';
  const originalEnv = { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, AI_DEMO: process.env.AI_DEMO };
  let owner;
  let auth;
  let projectId;
  let otherProjectId;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[email, otherEmail]]);
    owner = await insertUser(email);
    const other = await insertUser(otherEmail);
    auth = `Bearer ${tokenFor(owner)}`;
    projectId = (await pool.query(`INSERT INTO projects (user_id, name) VALUES ($1, 'Loja Online') RETURNING id`, [owner.id]))
      .rows[0].id;
    otherProjectId = (await pool.query(`INSERT INTO projects (user_id, name) VALUES ($1, 'Alheio') RETURNING id`, [other.id]))
      .rows[0].id;
  });

  beforeEach(async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.AI_DEMO = 'true';
    aiService.resetProviderForTests();
    // Só as linhas deste usuário: os arquivos de teste rodam em paralelo no mesmo banco
    await pool.query('DELETE FROM ai_usage WHERE user_id = $1', [owner.id]);
  });

  afterAll(async () => {
    Object.assign(process.env, originalEnv);
    if (originalEnv.ANTHROPIC_API_KEY === undefined) delete process.env.ANTHROPIC_API_KEY;
    if (originalEnv.AI_DEMO === undefined) delete process.env.AI_DEMO;
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[email, otherEmail]]);
    await pool.end();
  });

  const suggestionsUrl = (id, level = 'context') => `/api/projects/${id}/diagrams/${level}/suggestions`;

  describe('GET /api/ai/status', () => {
    it('deve exigir login', async () => {
      expect((await request(app).get('/api/ai/status')).status).toBe(401);
    });

    it('deve informar o modo e o que resta hoje', async () => {
      const response = await request(app).get('/api/ai/status').set('Authorization', auth);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        mode: 'demo',
        limits: { suggestion: AI_LIMITS.suggestion, deep: AI_LIMITS.deep },
        remaining: { suggestion: AI_LIMITS.suggestion, deep: AI_LIMITS.deep },
      });
    });

    it('deve informar desligada sem chave nem demonstração', async () => {
      delete process.env.AI_DEMO;

      const response = await request(app).get('/api/ai/status').set('Authorization', auth);

      expect(response.body).toEqual(expect.objectContaining({ mode: 'disabled', remaining: null }));
    });
  });

  describe('POST /api/projects/:projectId/diagrams/:level/suggestions', () => {
    it('deve exigir login', async () => {
      expect((await request(app).post(suggestionsUrl(projectId)).send({ diagram })).status).toBe(401);
    });

    it('deve devolver sugestões conferidas pelo motor, sem alterar o diagrama, e descontar do limite', async () => {
      const response = await request(app).post(suggestionsUrl(projectId)).set('Authorization', auth).send({ diagram });

      expect(response.status).toBe(200);
      expect(response.body.source).toBe('demo');
      expect(response.body.escalated).toBe(false);
      expect(response.body.suggestions.length).toBeGreaterThan(0);
      expect(response.body.suggestions).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'improve_text', nodeId: 'n2', targetName: 'Loja Online' })])
      );
      expect(response.body.remaining).toEqual({ suggestion: AI_LIMITS.suggestion - 1, deep: AI_LIMITS.deep });

      const saved = await pool.query('SELECT count(*)::int AS total FROM diagrams WHERE project_id = $1', [projectId]);
      expect(saved.rows[0].total).toBe(0);
    });

    it('deve sugerir um ponto de partida para um nível vazio', async () => {
      const response = await request(app)
        .post(suggestionsUrl(projectId, 'container'))
        .set('Authorization', auth)
        .send({ diagram: { nodes: [], edges: [] }, description: 'Loja de livros' });

      expect(response.status).toBe(200);
      expect(response.body.suggestions.every((item) => ['c4-person', 'c4-system-external', 'c4-container', 'c4-container-db', null].includes(item.elementType))).toBe(true);
    });

    it('deve responder 429 ao passar do limite diário de análises aprofundadas', async () => {
      for (let index = 0; index < AI_LIMITS.deep; index++) {
        await pool.query(`INSERT INTO ai_usage (user_id, kind, cost_usd) VALUES ($1, 'deep', 0)`, [owner.id]);
      }

      const response = await request(app)
        .post(suggestionsUrl(projectId))
        .set('Authorization', auth)
        .send({ diagram, depth: 'deep' });

      expect(response.status).toBe(429);
      expect(response.body.scope).toBe('deep');
    });

    it('não deve deixar pedidos simultâneos passarem do limite diário', async () => {
      const responses = await Promise.all(
        Array.from({ length: AI_LIMITS.suggestion + 10 }, () =>
          request(app).post(suggestionsUrl(projectId)).set('Authorization', auth).send({ diagram })
        )
      );

      const statuses = responses.map((response) => response.status);
      expect(statuses.filter((status) => status === 200)).toHaveLength(AI_LIMITS.suggestion);
      expect(statuses.filter((status) => status === 429)).toHaveLength(10);
    });

    it('deve responder 503 com a IA desligada', async () => {
      delete process.env.AI_DEMO;

      const response = await request(app).post(suggestionsUrl(projectId)).set('Authorization', auth).send({ diagram });

      expect(response.status).toBe(503);
    });

    it('deve responder 404 para projeto de outro usuário', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const response = await request(app).post(suggestionsUrl(otherProjectId)).set('Authorization', auth).send({ diagram });

      expect(response.status).toBe(404);
      console.warn.mockRestore();
    });

    it.each([
      ['nível inválido', 'code', { diagram }],
      ['diagrama ausente', 'context', {}],
      ['profundidade desconhecida', 'context', { diagram, depth: 'max' }],
    ])('deve responder 400 para %s', async (_, level, body) => {
      const response = await request(app).post(suggestionsUrl(projectId, level)).set('Authorization', auth).send(body);

      expect(response.status).toBe(400);
    });
  });
});
