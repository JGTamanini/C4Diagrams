const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const { InvalidCredentialsError } = require('../errors/auth.errors');
const { assertNotLocked, registerFailedAttempt } = require('./passwordAttempts');

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  assertNotLocked(user);

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    await registerFailedAttempt(user.id);
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