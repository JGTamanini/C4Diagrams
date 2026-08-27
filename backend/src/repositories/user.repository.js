const { pool } = require('../config/database');

async function create(user) {
  const { name, email, passwordHash, verificationToken, verificationTokenExpiresAt } = user;

  const query = `
    INSERT INTO users (name, email, password_hash, verification_token, verification_token_expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, email_verified, created_at, updated_at
  `;

  const values = [name, email, passwordHash, verificationToken, verificationTokenExpiresAt];

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function findByEmail(email) {
  const query = `
    SELECT id, name, email, password_hash, email_verified, verification_token,
           verification_token_expires_at, failed_login_attempts, locked_until,
           created_at, updated_at
    FROM users
    WHERE email = $1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0];
}

async function incrementFailedAttempts(userId) {
  const query = `
    UPDATE users
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = $1
    RETURNING failed_login_attempts
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0].failed_login_attempts;
}

async function resetFailedAttempts(userId) {
  const query = `
    UPDATE users
    SET failed_login_attempts = 0, locked_until = NULL
    WHERE id = $1
  `;

  await pool.query(query, [userId]);
}

async function lockAccount(userId, lockedUntil) {
  const query = `
    UPDATE users
    SET locked_until = $2
    WHERE id = $1
  `;

  await pool.query(query, [userId, lockedUntil]);
}

module.exports = {
  create,
  findByEmail,
  incrementFailedAttempts,
  resetFailedAttempts,
  lockAccount,
};