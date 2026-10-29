const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { pool } = require('../../src/config/database');

const PASSWORD = 'Senha@12345';

async function insertUser(email) {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified) VALUES ($1, $2, $3, true) RETURNING id, email`,
    ['Conta E2E', email, passwordHash]
  );
  return result.rows[0];
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Rotas de usuário /api/users', () => {
  const email = 'delete.account.e2e@example.com';
  let user;
  let auth;

  beforeEach(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    user = await insertUser(email);
    auth = `Bearer ${tokenFor(user)}`;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    await pool.end();
  });

  describe('DELETE /me (excluir a própria conta)', () => {
    it('deve retornar 401 sem token (RN01)', async () => {
      const response = await request(app).delete('/api/users/me').send({ password: PASSWORD });

      expect(response.status).toBe(401);
    });

    it('deve excluir a conta com a senha correta, levando junto os projetos (RN05)', async () => {
      await pool.query(`INSERT INTO projects (user_id, name) VALUES ($1, 'Loja')`, [user.id]);

      const response = await request(app).delete('/api/users/me').set('Authorization', auth).send({ password: PASSWORD });

      expect(response.status).toBe(204);
      expect((await pool.query('SELECT 1 FROM users WHERE id = $1', [user.id])).rowCount).toBe(0);
      expect((await pool.query('SELECT 1 FROM projects WHERE user_id = $1', [user.id])).rowCount).toBe(0);
    });

    it('deve responder 403 (e não 401, que encerraria a sessão no frontend) com a senha errada, sem excluir', async () => {
      const response = await request(app).delete('/api/users/me').set('Authorization', auth).send({ password: 'Errada@123' });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: 'Senha incorreta.' });
      expect((await pool.query('SELECT 1 FROM users WHERE id = $1', [user.id])).rowCount).toBe(1);
    });

    it('deve responder 400 sem a senha', async () => {
      const response = await request(app).delete('/api/users/me').set('Authorization', auth).send({});

      expect(response.status).toBe(400);
    });
  });
});
