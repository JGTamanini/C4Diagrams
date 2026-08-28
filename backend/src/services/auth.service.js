const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const { InvalidCredentialsError, AccountLockedError } = require('../errors/auth.errors');

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutos

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesRemaining = Math.ceil(
      (new Date(user.locked_until) - Date.now()) / (60 * 1000)
    );
    throw new AccountLockedError(minutesRemaining);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const attempts = await userRepository.incrementFailedAttempts(user.id);

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await userRepository.lockAccount(user.id, lockedUntil);
    }

    throw new InvalidCredentialsError();
  }

  await userRepository.resetFailedAttempts(user.id);

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const { password_hash, failed_login_attempts, locked_until, verification_token, verification_token_expires_at, ...safeUser } = user;

  return { token, user: safeUser };
}

module.exports = { login };