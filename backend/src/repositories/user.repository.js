const { pool } = require('../config/database');

async function create(user) {
  const { name, email, passwordHash, verificationToken, verificationTokenExpiresAt, verificationSentAt } = user;

  const query = `
    INSERT INTO users (name, email, password_hash, verification_token, verification_token_expires_at, verification_sent_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, email, email_verified, created_at, updated_at
  `;

  const values = [name, email, passwordHash, verificationToken, verificationTokenExpiresAt, verificationSentAt ?? null];

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

// Nota: reserva o reenvio de forma atômica e devolve o token a enviar (ou null se não puder reenviar).
// - Intervalo mínimo no WHERE: com duas requisições simultâneas, o Postgres trava a linha e a segunda
//   reavalia o WHERE após a primeira gravar, então só uma reenvia.
// - Token ainda válido é reaproveitado: um reenvio feito por terceiros não invalida o link já recebido.
//   Só um token vencido (ou ausente) é trocado pelo candidato. No SET, as colunas referem-se aos valores anteriores.
async function claimVerificationResend(userId, { token, expiresAt, now, notSentAfter }) {
  const query = `
    UPDATE users
    SET verification_sent_at = $4,
        verification_token = CASE
          WHEN verification_token IS NULL OR verification_token_expires_at <= $4 THEN $2
          ELSE verification_token
        END,
        verification_token_expires_at = CASE
          WHEN verification_token IS NULL OR verification_token_expires_at <= $4 THEN $3
          ELSE verification_token_expires_at
        END
    WHERE id = $1
      AND email_verified = false
      AND (verification_sent_at IS NULL OR verification_sent_at <= $5)
    RETURNING verification_token
  `;

  const result = await pool.query(query, [userId, token, expiresAt, now, notSentAfter]);

  return result.rows[0]?.verification_token ?? null;
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
  claimVerificationResend,
  setPasswordResetToken,
  findByPasswordResetToken,
  updatePassword,
};