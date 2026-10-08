const { pool } = require('../../src/config/database');
const diagramRepository = require('../../src/repositories/diagram.repository');

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
    ['Diagram Repo User', email, 'hashed_password_123']
  );
  return result.rows[0].id;
}

async function insertProject(userId, name) {
  const result = await pool.query(`INSERT INTO projects (user_id, name) VALUES ($1, $2) RETURNING id`, [userId, name]);
  return result.rows[0].id;
}

const contextData = {
  nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } }],
  edges: [],
};

describe('DiagramRepository', () => {
  const ownerEmail = 'owner.diagram.repository@example.com';
  const otherEmail = 'other.diagram.repository@example.com';
  let ownerId;
  let otherUserId;
  let projectId;
  let otherProjectId;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[ownerEmail, otherEmail]]);
    ownerId = await insertUser(ownerEmail);
    otherUserId = await insertUser(otherEmail);
  });

  beforeEach(async () => {
    projectId = await insertProject(ownerId, 'Projeto do dono');
    otherProjectId = await insertProject(otherUserId, 'Projeto alheio');
  });

  afterEach(async () => {
    await pool.query('DELETE FROM projects WHERE user_id = ANY($1)', [[ownerId, otherUserId]]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[ownerId, otherUserId]]);
    await pool.end();
  });

  describe('upsert', () => {
    it('deve criar o diagrama do nível e retornar level, data e updated_at', async () => {
      const diagram = await diagramRepository.upsert(projectId, ownerId, 'context', contextData);

      expect(diagram.level).toBe('context');
      expect(diagram.data).toEqual(contextData);
      expect(diagram).toHaveProperty('updated_at');
      expect(diagram).not.toHaveProperty('project_id');
    });

    it('deve substituir o diagrama existente do mesmo nível, sem duplicar', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);
      const updatedData = { nodes: [{ ...contextData.nodes[0], data: { label: 'Cliente VIP' } }], edges: [] };

      const diagram = await diagramRepository.upsert(projectId, ownerId, 'context', updatedData);

      expect(diagram.data).toEqual(updatedData);
      const count = await pool.query('SELECT COUNT(*)::int AS total FROM diagrams WHERE project_id = $1', [projectId]);
      expect(count.rows[0].total).toBe(1);
    });

    it('deve renovar o updated_at do projeto ao salvar o diagrama', async () => {
      await pool.query(`UPDATE projects SET updated_at = now() - interval '1 day' WHERE id = $1`, [projectId]);
      const before = await pool.query('SELECT updated_at FROM projects WHERE id = $1', [projectId]);

      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);

      const after = await pool.query('SELECT updated_at FROM projects WHERE id = $1', [projectId]);
      expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(before.rows[0].updated_at.getTime());
    });

    it('deve retornar undefined e não gravar nada em projeto de outro usuário', async () => {
      const diagram = await diagramRepository.upsert(otherProjectId, ownerId, 'context', contextData);

      expect(diagram).toBeUndefined();
      const count = await pool.query('SELECT COUNT(*)::int AS total FROM diagrams WHERE project_id = $1', [otherProjectId]);
      expect(count.rows[0].total).toBe(0);
    });
  });

  describe('findAllByProject', () => {
    it('deve retornar os diagramas salvos na ordem dos níveis C4', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'component', contextData);
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);

      const diagrams = await diagramRepository.findAllByProject(projectId, ownerId);

      expect(diagrams.map((d) => d.level)).toEqual(['context', 'component']);
    });

    it('deve retornar array vazio para projeto de outro usuário', async () => {
      await diagramRepository.upsert(otherProjectId, otherUserId, 'context', contextData);

      const diagrams = await diagramRepository.findAllByProject(otherProjectId, ownerId);

      expect(diagrams).toEqual([]);
    });
  });

  describe('remove', () => {
    it('deve remover o diagrama do nível e retornar true', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);

      const removed = await diagramRepository.remove(projectId, ownerId, 'context');

      expect(removed).toBe(true);
      expect(await diagramRepository.findAllByProject(projectId, ownerId)).toEqual([]);
    });

    it('deve retornar false e manter o diagrama de outro usuário', async () => {
      await diagramRepository.upsert(otherProjectId, otherUserId, 'context', contextData);

      const removed = await diagramRepository.remove(otherProjectId, ownerId, 'context');

      expect(removed).toBe(false);
      expect(await diagramRepository.findAllByProject(otherProjectId, otherUserId)).toHaveLength(1);
    });
  });
});
