const { pool } = require('../config/database');

// O "hoje" dos limites é o dia de Brasília (vira à meia-noite daqui, não às 21h, que é a meia-noite em UTC)
const TODAY = `(created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date`;

async function record(userId, kind, costUsd) {
  await pool.query('INSERT INTO ai_usage (user_id, kind, cost_usd) VALUES ($1, $2, $3)', [userId, kind, costUsd]);
}

async function countToday(userId) {
  const result = await pool.query(
    `SELECT kind, count(*)::int AS total FROM ai_usage WHERE user_id = $1 AND ${TODAY} GROUP BY kind`,
    [userId]
  );

  const counts = { suggestion: 0, deep: 0, escalation: 0 };
  for (const row of result.rows) counts[row.kind] = row.total;
  return counts;
}

// Gasto de hoje de todos os usuários: o teto do sistema
async function costToday() {
  const result = await pool.query(`SELECT coalesce(sum(cost_usd), 0) AS total FROM ai_usage WHERE ${TODAY}`);
  return Number(result.rows[0].total);
}

module.exports = { record, countToday, costToday };
