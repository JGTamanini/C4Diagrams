const { pool } = require('../config/database');

// Nota: user_id nunca é exposto — o dono é sempre o próprio usuário autenticado
const PUBLIC_COLUMNS = 'id, name, description, created_at, updated_at';

async function create(userId, project) {
  const { name, description } = project;

  const query = `
    INSERT INTO projects (user_id, name, description)
    VALUES ($1, $2, $3)
    RETURNING ${PUBLIC_COLUMNS}
  `;

  const result = await pool.query(query, [userId, name, description ?? null]);

  return result.rows[0];
}

// Nota: cada projeto vem com a prévia do diagrama de Contexto (nível 1) para o card do dashboard — uma única
// consulta, sem uma requisição por projeto. Sem diagrama de Contexto salvo, preview é null.
async function findAllByUser(userId) {
  const query = `
    SELECT p.id, p.name, p.description, p.created_at, p.updated_at, d.data AS preview
    FROM projects p
    LEFT JOIN diagrams d ON d.project_id = p.id AND d.level = 'context'
    WHERE p.user_id = $1
    ORDER BY p.updated_at DESC
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

async function findById(id, userId) {
  const query = `
    SELECT ${PUBLIC_COLUMNS}
    FROM projects
    WHERE id = $1 AND user_id = $2
  `;

  const result = await pool.query(query, [id, userId]);

  return result.rows[0];
}

// Nota: atualização parcial (PATCH) — só altera as chaves presentes em changes.
// name nunca é nulo, então COALESCE basta; description usa flag para distinguir "limpar" (null) de "não enviado"
async function update(id, userId, changes) {
  const hasDescription = Object.hasOwn(changes, 'description');

  const query = `
    UPDATE projects
    SET name = COALESCE($3, name),
        description = CASE WHEN $4::boolean THEN $5 ELSE description END,
        updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING ${PUBLIC_COLUMNS}
  `;

  const values = [id, userId, changes.name ?? null, hasDescription, hasDescription ? changes.description : null];

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function remove(id, userId) {
  const query = `
    DELETE FROM projects
    WHERE id = $1 AND user_id = $2
  `;

  const result = await pool.query(query, [id, userId]);

  return result.rowCount > 0;
}

module.exports = {
  create,
  findAllByUser,
  findById,
  update,
  remove,
};
