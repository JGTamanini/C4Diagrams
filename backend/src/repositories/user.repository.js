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
           password_reset_token, password_reset_token_expires_at,
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

async function findByVerificationToken(token) {
  const query = `
    SELECT id, name, email, password_hash, email_verified, verification_token,
           verification_token_expires_at, failed_login_attempts, locked_until,
           created_at, updated_at
    FROM users
    WHERE verification_token = $1
  `;

  const result = await pool.query(query, [token]);

  return result.rows[0];
}

async function markEmailAsVerified(userId) {
  const query = `
    UPDATE users
    SET email_verified = true, verification_token = NULL, verification_token_expires_at = NULL
    WHERE id = $1
  `;

  await pool.query(query, [userId]);
}

async function setPasswordResetToken(userId, token, expiresAt) {
  const query = `
    UPDATE users
    SET password_reset_token = $2, password_reset_token_expires_at = $3
    WHERE id = $1
  `;

  await pool.query(query, [userId, token, expiresAt]);
}

async function findByPasswordResetToken(token) {
  const query = `
    SELECT id, name, email, password_hash, email_verified, verification_token,
           verification_token_expires_at, failed_login_attempts, locked_until,
           password_reset_token, password_reset_token_expires_at,
           created_at, updated_at
    FROM users
    WHERE password_reset_token = $1
  `;

  const result = await pool.query(query, [token]);

  return result.rows[0];
}

async function updatePassword(userId, passwordHash) {
  const query = `
    UPDATE users
    SET password_hash = $2,
        password_reset_token = NULL,
        password_reset_token_expires_at = NULL,
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = $1
  `;

  await pool.query(query, [userId, passwordHash]);
}

module.exports = {
  create,
  findByEmail,
  incrementFailedAttempts,
  resetFailedAttempts,
  lockAccount,
  findByVerificationToken,
  markEmailAsVerified,
  setPasswordResetToken,
  findByPasswordResetToken,
  updatePassword,
};