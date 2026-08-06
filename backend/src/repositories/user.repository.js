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
           verification_token_expires_at, created_at, updated_at
    FROM users
    WHERE email = $1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0];
}

module.exports = {
  create,
  findByEmail,
};