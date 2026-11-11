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

  // Concorrência otimista (issue #74): cada nível tem uma versão, e a aba só grava sobre a versão que conhece
  describe('versão do nível', () => {
    const projectUpdatedAt = async (id) => (await pool.query('SELECT updated_at FROM projects WHERE id = $1', [id])).rows[0].updated_at.getTime();
    const ageProject = (id) => pool.query(`UPDATE projects SET updated_at = now() - interval '1 day' WHERE id = $1`, [id]);
    const changed = { nodes: [{ ...contextData.nodes[0], data: { label: 'Mudou' } }], edges: [] };

    it('deve começar na versão 1 e somar 1 a cada gravação, também na listagem', async () => {
      expect((await diagramRepository.upsert(projectId, ownerId, 'context', contextData)).version).toBe(1);
      expect((await diagramRepository.upsert(projectId, ownerId, 'context', changed)).version).toBe(2);

      const [listed] = await diagramRepository.findAllByProject(projectId, ownerId);
      expect(listed.version).toBe(2);
    });

    it('findVersion: deve devolver a versão do nível, ou null quando ele não existe ou o projeto é de outro usuário', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);
      await diagramRepository.upsert(otherProjectId, otherUserId, 'context', contextData);

      expect(await diagramRepository.findVersion(projectId, ownerId, 'context')).toBe(1);
      expect(await diagramRepository.findVersion(projectId, ownerId, 'container')).toBeNull();
      expect(await diagramRepository.findVersion(otherProjectId, ownerId, 'context')).toBeNull();
    });

    it('insertIfAbsent: deve criar o nível que ainda não existe, na versão 1, renovando a data do projeto', async () => {
      await ageProject(projectId);
      const before = await projectUpdatedAt(projectId);

      const diagram = await diagramRepository.insertIfAbsent(projectId, ownerId, 'context', contextData);

      expect(diagram).toEqual(expect.objectContaining({ level: 'context', data: contextData, version: 1 }));
      expect(await projectUpdatedAt(projectId)).toBeGreaterThan(before);
    });

    it('insertIfAbsent: não deve mexer em nada se o nível já existe (outra aba o criou) ou se o projeto é alheio', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);
      await ageProject(projectId);
      const before = await projectUpdatedAt(projectId);

      expect(await diagramRepository.insertIfAbsent(projectId, ownerId, 'context', changed)).toBeUndefined();
      expect(await diagramRepository.insertIfAbsent(otherProjectId, ownerId, 'context', contextData)).toBeUndefined();

      const [saved] = await diagramRepository.findAllByProject(projectId, ownerId);
      expect(saved.data).toEqual(contextData);
      expect(await projectUpdatedAt(projectId)).toBe(before);
      expect(await diagramRepository.findAllByProject(otherProjectId, otherUserId)).toEqual([]);
    });

    it('updateIfVersion: deve gravar quando a versão ainda é a atual, somando 1', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);

      const diagram = await diagramRepository.updateIfVersion(projectId, ownerId, 'context', changed, 1);

      expect(diagram).toEqual(expect.objectContaining({ data: changed, version: 2 }));
    });

    it('updateIfVersion: não deve gravar sobre uma versão mais nova, nem renovar a data do projeto', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);
      await ageProject(projectId);
      const before = await projectUpdatedAt(projectId);

      expect(await diagramRepository.updateIfVersion(projectId, ownerId, 'context', changed, 1)).toBeUndefined();

      const [saved] = await diagramRepository.findAllByProject(projectId, ownerId);
      expect(saved).toEqual(expect.objectContaining({ data: contextData, version: 2 }));
      expect(await projectUpdatedAt(projectId)).toBe(before);
    });

    it('updateIfVersion: não deve gravar em projeto de outro usuário', async () => {
      await diagramRepository.upsert(otherProjectId, otherUserId, 'context', contextData);

      expect(await diagramRepository.updateIfVersion(otherProjectId, ownerId, 'context', changed, 1)).toBeUndefined();
    });

    it('removeIfVersion: deve esvaziar o nível só quando a versão ainda é a atual', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);
      await diagramRepository.upsert(projectId, ownerId, 'context', changed);

      expect(await diagramRepository.removeIfVersion(projectId, ownerId, 'context', 1)).toBe(false);
      expect(await diagramRepository.findAllByProject(projectId, ownerId)).toHaveLength(1);

      expect(await diagramRepository.removeIfVersion(projectId, ownerId, 'context', 2)).toBe(true);
      expect(await diagramRepository.findAllByProject(projectId, ownerId)).toEqual([]);
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

    it('deve renovar o updated_at do projeto ao esvaziar um nível (também é uma edição)', async () => {
      await diagramRepository.upsert(projectId, ownerId, 'context', contextData);
      await pool.query(`UPDATE projects SET updated_at = now() - interval '1 day' WHERE id = $1`, [projectId]);
      const before = await pool.query('SELECT updated_at FROM projects WHERE id = $1', [projectId]);

      await diagramRepository.remove(projectId, ownerId, 'context');

      const after = await pool.query('SELECT updated_at FROM projects WHERE id = $1', [projectId]);
      expect(after.rows[0].updated_at.getTime()).toBeGreaterThan(before.rows[0].updated_at.getTime());
    });

    it('não deve renovar o updated_at de projeto de outro usuário', async () => {
      await pool.query(`UPDATE projects SET updated_at = now() - interval '1 day' WHERE id = $1`, [otherProjectId]);
      const before = await pool.query('SELECT updated_at FROM projects WHERE id = $1', [otherProjectId]);

      await diagramRepository.remove(otherProjectId, ownerId, 'context');

      const after = await pool.query('SELECT updated_at FROM projects WHERE id = $1', [otherProjectId]);
      expect(after.rows[0].updated_at.getTime()).toBe(before.rows[0].updated_at.getTime());
    });

    it('deve retornar false e manter o diagrama de outro usuário', async () => {
      await diagramRepository.upsert(otherProjectId, otherUserId, 'context', contextData);

      const removed = await diagramRepository.remove(otherProjectId, ownerId, 'context');

      expect(removed).toBe(false);
      expect(await diagramRepository.findAllByProject(otherProjectId, otherUserId)).toHaveLength(1);
    });
  });
});
