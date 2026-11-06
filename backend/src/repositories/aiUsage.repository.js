const { pool } = require('../config/database');

// O "hoje" dos limites é o dia de Brasília (vira à meia-noite daqui, não às 21h, que é a meia-noite em UTC). Intervalo
// sobre a coluna pura, para o banco usar os índices de created_at
const TODAY = `created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`;

// Trava da reserva: uma só, porque o teto de gasto é do sistema inteiro (a transação é curta e não espera pela IA)
const RESERVATION_LOCK = 16016;

// Nota: RF16 — reserva o pedido ANTES de chamar a IA. Conferir e gravar numa mesma transação, sob a trava, impede que
// pedidos simultâneos passem todos pela conferência antes de algum ser gravado. A linha já entra com o custo máximo
// estimado, então os pedidos em andamento contam no teto; depois, settle troca pelo custo real (ou release desfaz).
async function reserve(userId, kind, { limit, budgetUsd, estimatedCost }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [RESERVATION_LOCK]);

    const used = await client.query(`SELECT count(*)::int AS total FROM ai_usage WHERE user_id = $1 AND kind = $2 AND ${TODAY}`, [
      userId,
      kind,
    ]);
    if (used.rows[0].total >= limit) {
      await client.query('ROLLBACK');
      return { ok: false, scope: kind };
    }

    const spent = await client.query(`SELECT coalesce(sum(cost_usd), 0) AS total FROM ai_usage WHERE ${TODAY}`);
    if (Number(spent.rows[0].total) >= budgetUsd) {
      await client.query('ROLLBACK');
      return { ok: false, scope: 'system' };
    }

    const inserted = await client.query('INSERT INTO ai_usage (user_id, kind, cost_usd) VALUES ($1, $2, $3) RETURNING id', [
      userId,
      kind,
      estimatedCost,
    ]);
    await client.query('COMMIT');
    return { ok: true, id: inserted.rows[0].id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function settle(id, costUsd) {
  await pool.query('UPDATE ai_usage SET cost_usd = $2 WHERE id = $1', [id, costUsd]);
}

async function release(id) {
  await pool.query('DELETE FROM ai_usage WHERE id = $1', [id]);
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

module.exports = { TODAY, reserve, settle, release, countToday, costToday };
