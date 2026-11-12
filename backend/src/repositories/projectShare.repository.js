const { pool } = require('../config/database');

// Nota: a ordem segue a hierarquia C4 (Contexto → Container → Componente)
const LEVEL_ORDER = `ARRAY['context', 'container', 'component']::varchar[]`;

// Nota: link de visualização (só leitura). Guardar ou trocar o código não mexe no updated_at do projeto: essa data é
// a "última alteração" que quem visualiza vê, e só mudanças no diagrama contam.
async function setToken(projectId, userId, token) {
  const result = await pool.query('UPDATE projects SET share_token = $3 WHERE id = $1 AND user_id = $2', [projectId, userId, token]);
  return result.rowCount > 0;
}

async function clearToken(projectId, userId) {
  const result = await pool.query('UPDATE projects SET share_token = NULL WHERE id = $1 AND user_id = $2', [projectId, userId]);
  return result.rowCount > 0;
}

// { token } do projeto do dono (token null: sem link), ou null se o projeto não é dele
async function findToken(projectId, userId) {
  const result = await pool.query('SELECT share_token FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
  return result.rows[0] ? { token: result.rows[0].share_token } : null;
}

// O projeto aberto pelo link: nome, descrição, nome do dono, data da última alteração e os diagramas. Nada que
// identifique o projeto ou o dono (ids, e-mail) sai daqui.
async function findByToken(token) {
  const projectResult = await pool.query(
    `SELECT p.id, p.name, p.description, p.updated_at, u.name AS owner_name
     FROM projects p
     JOIN users u ON u.id = p.user_id
     WHERE p.share_token = $1`,
    [token]
  );
  const project = projectResult.rows[0];
  if (!project) return null;

  const diagramsResult = await pool.query(
    `SELECT level, data FROM diagrams WHERE project_id = $1 ORDER BY array_position(${LEVEL_ORDER}, level)`,
    [project.id]
  );

  return {
    name: project.name,
    description: project.description,
    ownerName: project.owner_name,
    updatedAt: project.updated_at,
    diagrams: diagramsResult.rows,
  };
}

module.exports = { setToken, clearToken, findToken, findByToken };
