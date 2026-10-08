const { pool } = require('../config/database');

// Nota: a ordem segue a hierarquia C4 (Contexto → Container → Componente), não a ordem de criação
const LEVEL_ORDER = `ARRAY['context', 'container', 'component']::varchar[]`;

async function findAllByProject(projectId, userId) {
  const query = `
    SELECT d.level, d.data, d.updated_at
    FROM diagrams d
    JOIN projects p ON p.id = d.project_id
    WHERE d.project_id = $1 AND p.user_id = $2
    ORDER BY array_position(${LEVEL_ORDER}, d.level)
  `;

  const result = await pool.query(query, [projectId, userId]);

  return result.rows;
}

// Nota: uma única query — o CTE só "encontra" o projeto se ele for do usuário (e já renova o updated_at dele,
// refletindo a edição no "Editado em" do dashboard). Projeto alheio ou inexistente: nada é gravado.
async function upsert(projectId, userId, level, data) {
  const query = `
    WITH owned_project AS (
      UPDATE projects SET updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    )
    INSERT INTO diagrams (project_id, level, data)
    SELECT id, $3, $4 FROM owned_project
    ON CONFLICT (project_id, level) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    RETURNING level, data, updated_at
  `;

  const result = await pool.query(query, [projectId, userId, level, data]);

  return result.rows[0];
}

async function remove(projectId, userId, level) {
  const query = `
    DELETE FROM diagrams d
    USING projects p
    WHERE d.project_id = p.id
      AND p.id = $1
      AND p.user_id = $2
      AND d.level = $3
  `;

  const result = await pool.query(query, [projectId, userId, level]);

  return result.rowCount > 0;
}

module.exports = { findAllByProject, upsert, remove };
