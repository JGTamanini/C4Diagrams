const { pool } = require('../../src/config/database');
const projectRepository = require('../../src/repositories/project.repository');

const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
    ['Project Repo User', email, 'hashed_password_123']
  );
  return result.rows[0].id;
}

async function findRawProject(id) {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0];
}

describe('ProjectRepository', () => {
  const ownerEmail = 'owner.project.repository@example.com';
  const otherEmail = 'other.project.repository@example.com';
  let ownerId;
  let otherUserId;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[ownerEmail, otherEmail]]);
    ownerId = await insertUser(ownerEmail);
    otherUserId = await insertUser(otherEmail);
  });

  afterEach(async () => {
    await pool.query('DELETE FROM projects WHERE user_id = ANY($1)', [[ownerId, otherUserId]]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[ownerId, otherUserId]]);
    await pool.end();
  });

  describe('create', () => {
    it('deve criar o projeto vinculado ao usuário e retornar os dados públicos', async () => {
      const project = await projectRepository.create(ownerId, {
        name: 'Sistema de Pedidos',
        description: 'Arquitetura do e-commerce',
      });

      expect(project).toHaveProperty('id');
      expect(project.name).toBe('Sistema de Pedidos');
      expect(project.description).toBe('Arquitetura do e-commerce');
      expect(project).toHaveProperty('created_at');
      expect(project).toHaveProperty('updated_at');
      expect(project).not.toHaveProperty('user_id');

      const raw = await findRawProject(project.id);
      expect(raw.user_id).toBe(ownerId);
    });

    it('deve gravar description como null quando não informada', async () => {
      const project = await projectRepository.create(ownerId, { name: 'Sem descrição' });

      expect(project.description).toBeNull();
    });
  });

  describe('findAllByUser', () => {
    it('deve retornar apenas os projetos do usuário, do mais recente para o mais antigo', async () => {
      const older = await projectRepository.create(ownerId, { name: 'Antigo' });
      const newer = await projectRepository.create(ownerId, { name: 'Recente' });
      await projectRepository.create(otherUserId, { name: 'De outro usuário' });
      await pool.query(`UPDATE projects SET updated_at = now() - interval '1 day' WHERE id = $1`, [older.id]);

      const projects = await projectRepository.findAllByUser(ownerId);

      expect(projects.map((p) => p.id)).toEqual([newer.id, older.id]);
      expect(projects[0]).not.toHaveProperty('user_id');
    });

    it('deve retornar array vazio quando o usuário não tem projetos', async () => {
      const projects = await projectRepository.findAllByUser(ownerId);

      expect(projects).toEqual([]);
    });
  });

  describe('findById', () => {
    it('deve retornar o projeto quando pertence ao usuário', async () => {
      const created = await projectRepository.create(ownerId, { name: 'Meu projeto' });

      const project = await projectRepository.findById(created.id, ownerId);

      expect(project).toEqual(created);
    });

    it('deve retornar undefined quando o projeto pertence a outro usuário', async () => {
      const created = await projectRepository.create(otherUserId, { name: 'Alheio' });

      const project = await projectRepository.findById(created.id, ownerId);

      expect(project).toBeUndefined();
    });

    it('deve retornar undefined quando o projeto não existe', async () => {
      const project = await projectRepository.findById(NON_EXISTENT_ID, ownerId);

      expect(project).toBeUndefined();
    });
  });

  describe('update', () => {
    it('deve atualizar nome e descrição e renovar updated_at', async () => {
      const created = await projectRepository.create(ownerId, { name: 'Original', description: 'Antes' });
      await pool.query(`UPDATE projects SET updated_at = now() - interval '1 day' WHERE id = $1`, [created.id]);
      const before = await findRawProject(created.id);

      const updated = await projectRepository.update(created.id, ownerId, { name: 'Editado', description: 'Depois' });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Editado');
      expect(updated.description).toBe('Depois');
      expect(updated).not.toHaveProperty('user_id');
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime());
    });

    it('deve manter a descrição quando apenas o nome for informado', async () => {
      const created = await projectRepository.create(ownerId, { name: 'Original', description: 'Antes' });

      const updated = await projectRepository.update(created.id, ownerId, { name: 'Editado' });

      expect(updated.name).toBe('Editado');
      expect(updated.description).toBe('Antes');
    });

    it('deve manter o nome quando apenas a descrição for informada', async () => {
      const created = await projectRepository.create(ownerId, { name: 'Original', description: 'Antes' });

      const updated = await projectRepository.update(created.id, ownerId, { description: 'Depois' });

      expect(updated.name).toBe('Original');
      expect(updated.description).toBe('Depois');
    });

    it('deve limpar a descrição quando informada explicitamente como null', async () => {
      const created = await projectRepository.create(ownerId, { name: 'Original', description: 'Antes' });

      const updated = await projectRepository.update(created.id, ownerId, { description: null });

      expect(updated.name).toBe('Original');
      expect(updated.description).toBeNull();
    });

    it('deve retornar undefined e não alterar o projeto de outro usuário', async () => {
      const created = await projectRepository.create(otherUserId, { name: 'Alheio' });

      const updated = await projectRepository.update(created.id, ownerId, { name: 'Invadido' });

      expect(updated).toBeUndefined();
      const raw = await findRawProject(created.id);
      expect(raw.name).toBe('Alheio');
    });
  });

  describe('remove', () => {
    it('deve excluir o projeto do usuário e retornar true', async () => {
      const created = await projectRepository.create(ownerId, { name: 'Para excluir' });

      const removed = await projectRepository.remove(created.id, ownerId);

      expect(removed).toBe(true);
      expect(await findRawProject(created.id)).toBeUndefined();
    });

    it('deve retornar false e manter o projeto de outro usuário', async () => {
      const created = await projectRepository.create(otherUserId, { name: 'Alheio' });

      const removed = await projectRepository.remove(created.id, ownerId);

      expect(removed).toBe(false);
      expect(await findRawProject(created.id)).toBeDefined();
    });

    it('deve excluir em cascata os diagramas vinculados (RN05)', async () => {
      const created = await projectRepository.create(ownerId, { name: 'Com diagrama' });
      const diagram = await pool.query(
        `INSERT INTO diagrams (project_id, level) VALUES ($1, 'context') RETURNING id`,
        [created.id]
      );

      await projectRepository.remove(created.id, ownerId);

      const result = await pool.query('SELECT id FROM diagrams WHERE id = $1', [diagram.rows[0].id]);
      expect(result.rows).toHaveLength(0);
    });
  });
});
