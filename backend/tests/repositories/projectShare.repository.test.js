const { pool } = require('../../src/config/database');
const shareRepository = require('../../src/repositories/projectShare.repository');

async function insertUser(email, name) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
    [name, email, 'hashed_password_123']
  );
  return result.rows[0].id;
}

async function insertProject(userId, name) {
  const result = await pool.query(
    `INSERT INTO projects (user_id, name, description) VALUES ($1, $2, 'Loja de livros') RETURNING id`,
    [userId, name]
  );
  return result.rows[0].id;
}

const projectUpdatedAt = async (id) =>
  (await pool.query('SELECT updated_at FROM projects WHERE id = $1', [id])).rows[0].updated_at.getTime();

describe('ProjectShareRepository (link de visualização)', () => {
  const ownerEmail = 'owner.share.repository@example.com';
  const otherEmail = 'other.share.repository@example.com';
  let ownerId;
  let otherUserId;
  let projectId;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[ownerEmail, otherEmail]]);
    ownerId = await insertUser(ownerEmail, 'Ana Dona');
    otherUserId = await insertUser(otherEmail, 'Outro Usuário');
  });

  beforeEach(async () => {
    projectId = await insertProject(ownerId, 'Loja Online');
  });

  afterEach(async () => {
    await pool.query('DELETE FROM projects WHERE user_id = ANY($1)', [[ownerId, otherUserId]]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[ownerId, otherUserId]]);
    await pool.end();
  });

  it('deve guardar o código do link do projeto do dono, sem mudar a data da última alteração', async () => {
    await pool.query(`UPDATE projects SET updated_at = now() - interval '1 day' WHERE id = $1`, [projectId]);
    const before = await projectUpdatedAt(projectId);

    expect(await shareRepository.setToken(projectId, ownerId, 'codigo-a')).toBe(true);

    expect(await shareRepository.findToken(projectId, ownerId)).toEqual({ token: 'codigo-a' });
    expect(await projectUpdatedAt(projectId)).toBe(before);
  });

  it('não deve mexer no link de projeto de outro usuário', async () => {
    expect(await shareRepository.setToken(projectId, otherUserId, 'codigo-b')).toBe(false);
    expect(await shareRepository.clearToken(projectId, otherUserId)).toBe(false);
    expect(await shareRepository.findToken(projectId, otherUserId)).toBeNull();
    expect(await shareRepository.findToken(projectId, ownerId)).toEqual({ token: null });
  });

  it('deve revogar o link', async () => {
    await shareRepository.setToken(projectId, ownerId, 'codigo-c');

    expect(await shareRepository.clearToken(projectId, ownerId)).toBe(true);

    expect(await shareRepository.findToken(projectId, ownerId)).toEqual({ token: null });
    expect(await shareRepository.findByToken('codigo-c')).toBeNull();
  });

  it('deve abrir o projeto pelo código, com o nome do dono, a data e os diagramas na ordem dos níveis', async () => {
    await shareRepository.setToken(projectId, ownerId, 'codigo-d');
    const data = (label) => ({ nodes: [{ id: 'n1', type: 'c4-system', position: { x: 0, y: 0 }, data: { label } }], edges: [] });
    await pool.query(`INSERT INTO diagrams (project_id, level, data) VALUES ($1, 'container', $2), ($1, 'context', $3)`, [
      projectId,
      data('API'),
      data('Loja'),
    ]);

    const shared = await shareRepository.findByToken('codigo-d');

    expect(shared).toEqual({
      name: 'Loja Online',
      description: 'Loja de livros',
      ownerName: 'Ana Dona',
      updatedAt: expect.any(Date),
      diagrams: [
        { level: 'context', data: data('Loja') },
        { level: 'container', data: data('API') },
      ],
    });
    expect(shared).not.toHaveProperty('id');
  });

  it('deve devolver null para um código que não existe', async () => {
    expect(await shareRepository.findByToken('nao-existe')).toBeNull();
  });
});
