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

async function findAllByUser(userId) {
  const query = `
    SELECT ${PUBLIC_COLUMNS}
    FROM projects
    WHERE user_id = $1
    ORDER BY updated_at DESC
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

async function update(id, userId, project) {
  const { name, description } = project;

  const query = `
    UPDATE projects
    SET name = $3, description = $4, updated_at = now()
    WHERE id = $1 AND user_id = $2
    RETURNING ${PUBLIC_COLUMNS}
  `;

  const result = await pool.query(query, [id, userId, name, description ?? null]);

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
