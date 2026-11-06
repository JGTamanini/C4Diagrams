const { pool } = require('../../src/config/database');
const aiUsageRepository = require('../../src/repositories/aiUsage.repository');

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
    ['AI Usage Repo User', email, 'hashed_password_123']
  );
  return result.rows[0].id;
}

const NO_BUDGET_LIMIT = 1_000_000;

describe('AiUsageRepository', () => {
  const email = 'owner.ai.usage.repository@example.com';
  const otherEmail = 'other.ai.usage.repository@example.com';
  let userId;
  let otherUserId;

  function reserve(user, kind, { limit = 100, budgetUsd = NO_BUDGET_LIMIT, estimatedCost = 0.01 } = {}) {
    return aiUsageRepository.reserve(user, kind, { limit, budgetUsd, estimatedCost });
  }

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[email, otherEmail]]);
    userId = await insertUser(email);
    otherUserId = await insertUser(otherEmail);
  });

  // Só as linhas destes usuários: os arquivos de teste rodam em paralelo no mesmo banco
  beforeEach(async () => {
    await pool.query('DELETE FROM ai_usage WHERE user_id = ANY($1)', [[userId, otherUserId]]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[email, otherEmail]]);
    await pool.end();
  });

  describe('reserve', () => {
    it('deve gravar o pedido com o custo estimado e devolver o id da reserva', async () => {
      const reservation = await reserve(userId, 'deep', { estimatedCost: 0.35 });

      expect(reservation).toEqual({ ok: true, id: expect.any(String) });
      const { rows } = await pool.query('SELECT kind, cost_usd FROM ai_usage WHERE id = $1', [reservation.id]);
      expect(rows).toEqual([{ kind: 'deep', cost_usd: '0.350000' }]);
    });

    it('deve recusar ao atingir o limite do usuário naquele tipo de pedido, sem gravar', async () => {
      await reserve(userId, 'deep', { limit: 1 });

      expect(await reserve(userId, 'deep', { limit: 1 })).toEqual({ ok: false, scope: 'deep' });
      expect(await aiUsageRepository.countToday(userId)).toEqual({ suggestion: 0, deep: 1, escalation: 0 });
    });

    it('não deve misturar o limite de usuários nem de tipos de pedido diferentes', async () => {
      await reserve(userId, 'deep', { limit: 1 });

      expect((await reserve(otherUserId, 'deep', { limit: 1 })).ok).toBe(true);
      expect((await reserve(userId, 'suggestion', { limit: 1 })).ok).toBe(true);
    });

    it('deve recusar ao atingir o teto de gasto do sistema', async () => {
      expect(await reserve(userId, 'suggestion', { budgetUsd: 0 })).toEqual({ ok: false, scope: 'system' });
    });

    it('não deve deixar pedidos simultâneos passarem do limite', async () => {
      const results = await Promise.all(Array.from({ length: 30 }, () => reserve(userId, 'suggestion', { limit: 20 })));

      expect(results.filter((result) => result.ok)).toHaveLength(20);
      expect((await aiUsageRepository.countToday(userId)).suggestion).toBe(20);
    });

    it('deve contar a reserva dos pedidos em andamento no teto do sistema', async () => {
      const before = await aiUsageRepository.costToday();

      await reserve(userId, 'deep', { estimatedCost: 0.35 });

      expect((await aiUsageRepository.costToday()) - before).toBeGreaterThanOrEqual(0.35);
    });
  });

  describe('settle e release', () => {
    it('deve trocar a estimativa pelo custo real', async () => {
      const { id } = await reserve(userId, 'suggestion', { estimatedCost: 0.005 });

      await aiUsageRepository.settle(id, 0.0012);

      const { rows } = await pool.query('SELECT cost_usd FROM ai_usage WHERE id = $1', [id]);
      expect(rows[0].cost_usd).toBe('0.001200');
    });

    it('deve desfazer a reserva, devolvendo o pedido ao limite', async () => {
      const { id } = await reserve(userId, 'suggestion');

      await aiUsageRepository.release(id);

      expect((await aiUsageRepository.countToday(userId)).suggestion).toBe(0);
    });
  });

  it('deve ignorar os pedidos de dias anteriores (o dia vira à meia-noite de Brasília)', async () => {
    await pool.query(
      `INSERT INTO ai_usage (user_id, kind, cost_usd, created_at) VALUES ($1, 'suggestion', 0.5, now() - interval '1 day')`,
      [userId]
    );

    expect(await aiUsageRepository.countToday(userId)).toEqual({ suggestion: 0, deep: 0, escalation: 0 });
    expect((await reserve(userId, 'suggestion', { limit: 1 })).ok).toBe(true);
  });

  it('deve usar o índice de data, em vez de ler a tabela inteira a cada pedido', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL enable_seqscan = off');
      const { rows } = await client.query(`EXPLAIN SELECT sum(cost_usd) FROM ai_usage WHERE ${aiUsageRepository.TODAY}`);
      await client.query('ROLLBACK');

      expect(rows.map((row) => row['QUERY PLAN']).join('\n')).toMatch(/Index/);
    } finally {
      client.release();
    }
  });

  it('deve apagar o uso junto com a conta (LGPD)', async () => {
    const temporaryId = await insertUser('temp.ai.usage.repository@example.com');
    await reserve(temporaryId, 'suggestion');

    await pool.query('DELETE FROM users WHERE id = $1', [temporaryId]);

    const { rows } = await pool.query('SELECT count(*)::int AS total FROM ai_usage WHERE user_id = $1', [temporaryId]);
    expect(rows[0].total).toBe(0);
  });
});
