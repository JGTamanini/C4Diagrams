const { pool } = require('../config/database');

// Nota: a ordem segue a hierarquia C4 (Contexto → Container → Componente), não a ordem de criação
const LEVEL_ORDER = `ARRAY['context', 'container', 'component']::varchar[]`;

async function findAllByProject(projectId, userId) {
  const query = `
    SELECT d.level, d.data, d.updated_at, d.version
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
    ON CONFLICT (project_id, level) DO UPDATE
      SET data = EXCLUDED.data, updated_at = now(), version = diagrams.version + 1
    RETURNING level, data, updated_at, version
  `;

  const result = await pool.query(query, [projectId, userId, level, data]);

  return result.rows[0];
}

// Nota: mesmo padrão do upsert — esvaziar um nível também é uma edição, então renova o updated_at do projeto
async function remove(projectId, userId, level) {
  const query = `
    WITH owned_project AS (
      UPDATE projects SET updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    )
    DELETE FROM diagrams
    WHERE project_id IN (SELECT id FROM owned_project)
      AND level = $3
  `;

  const result = await pool.query(query, [projectId, userId, level]);

  return result.rowCount > 0;
}

// --- Concorrência otimista (issue #74) ---
// Nota: a aba só grava sobre a versão que conhece. As três operações abaixo renovam a data do projeto apenas quando
// gravam de fato (o CTE "touched" depende do resultado da gravação); uma recusa não deixa nenhum rastro.

// Cria o nível só se ele ainda não existe (a aba não conhece nenhuma versão dele)
async function insertIfAbsent(projectId, userId, level, data) {
  const query = `
    WITH owned_project AS (
      SELECT id FROM projects WHERE id = $1 AND user_id = $2
    ), inserted AS (
      INSERT INTO diagrams (project_id, level, data)
      SELECT id, $3, $4 FROM owned_project
      ON CONFLICT (project_id, level) DO NOTHING
      RETURNING level, data, updated_at, version
    ), touched AS (
      UPDATE projects SET updated_at = now()
      WHERE id IN (SELECT id FROM owned_project) AND EXISTS (SELECT 1 FROM inserted)
    )
    SELECT * FROM inserted
  `;

  const result = await pool.query(query, [projectId, userId, level, data]);

  return result.rows[0];
}

// Grava o nível só se a versão no banco ainda é a que a aba conhece
async function updateIfVersion(projectId, userId, level, data, version) {
  const query = `
    WITH updated AS (
      UPDATE diagrams d
      SET data = $4, updated_at = now(), version = d.version + 1
      FROM projects p
      WHERE p.id = d.project_id AND p.id = $1 AND p.user_id = $2 AND d.level = $3 AND d.version = $5
      RETURNING d.level, d.data, d.updated_at, d.version
    ), touched AS (
      UPDATE projects SET updated_at = now()
      WHERE id = $1 AND EXISTS (SELECT 1 FROM updated)
    )
    SELECT * FROM updated
  `;

  const result = await pool.query(query, [projectId, userId, level, data, version]);

  return result.rows[0];
}

// Esvazia o nível (RN10) só se a versão no banco ainda é a que a aba conhece
async function removeIfVersion(projectId, userId, level, version) {
  const query = `
    WITH removed AS (
      DELETE FROM diagrams d
      USING projects p
      WHERE p.id = d.project_id AND p.id = $1 AND p.user_id = $2 AND d.level = $3 AND d.version = $4
      RETURNING d.level
    ), touched AS (
      UPDATE projects SET updated_at = now()
      WHERE id = $1 AND EXISTS (SELECT 1 FROM removed)
    )
    SELECT * FROM removed
  `;

  const result = await pool.query(query, [projectId, userId, level, version]);

  return result.rowCount > 0;
}

// Versão atual do nível, ou null se ele não existe (ou o projeto não é do usuário)
async function findVersion(projectId, userId, level) {
  const query = `
    SELECT d.version
    FROM diagrams d
    JOIN projects p ON p.id = d.project_id
    WHERE d.project_id = $1 AND p.user_id = $2 AND d.level = $3
  `;

  const result = await pool.query(query, [projectId, userId, level]);

  return result.rows[0]?.version ?? null;
}

module.exports = { findAllByProject, upsert, remove, insertIfAbsent, updateIfVersion, removeIfVersion, findVersion };
