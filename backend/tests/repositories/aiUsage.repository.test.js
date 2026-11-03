const { pool } = require('../../src/config/database');
const aiUsageRepository = require('../../src/repositories/aiUsage.repository');

async function insertUser(email) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
    ['AI Usage Repo User', email, 'hashed_password_123']
  );
  return result.rows[0].id;
}

describe('AiUsageRepository', () => {
  const email = 'owner.ai.usage.repository@example.com';
  const otherEmail = 'other.ai.usage.repository@example.com';
  let userId;
  let otherUserId;

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[email, otherEmail]]);
    userId = await insertUser(email);
    otherUserId = await insertUser(otherEmail);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM ai_usage');
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [[email, otherEmail]]);
  });

  it('deve contar os pedidos de hoje do usuário, por tipo', async () => {
    await aiUsageRepository.record(userId, 'suggestion', 0.001);
    await aiUsageRepository.record(userId, 'suggestion', 0.002);
    await aiUsageRepository.record(userId, 'deep', 0.1);
    await aiUsageRepository.record(otherUserId, 'deep', 0.1);

    expect(await aiUsageRepository.countToday(userId)).toEqual({ suggestion: 2, deep: 1, escalation: 0 });
  });

  it('deve ignorar os pedidos de dias anteriores (o dia vira à meia-noite de Brasília)', async () => {
    await pool.query(
      `INSERT INTO ai_usage (user_id, kind, cost_usd, created_at) VALUES ($1, 'suggestion', 0.5, now() - interval '1 day')`,
      [userId]
    );

    expect(await aiUsageRepository.countToday(userId)).toEqual({ suggestion: 0, deep: 0, escalation: 0 });
    expect(await aiUsageRepository.costToday()).toBe(0);
  });

  it('deve somar o custo de hoje de todos os usuários (teto do sistema)', async () => {
    await aiUsageRepository.record(userId, 'suggestion', 0.0015);
    await aiUsageRepository.record(otherUserId, 'escalation', 0.07);

    expect(await aiUsageRepository.costToday()).toBeCloseTo(0.0715);
  });

  it('deve apagar o uso junto com a conta (LGPD)', async () => {
    const temporaryId = await insertUser('temp.ai.usage.repository@example.com');
    await aiUsageRepository.record(temporaryId, 'suggestion', 0.001);

    await pool.query('DELETE FROM users WHERE id = $1', [temporaryId]);

    const { rows } = await pool.query('SELECT count(*)::int AS total FROM ai_usage WHERE user_id = $1', [temporaryId]);
    expect(rows[0].total).toBe(0);
  });
});
