const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const { InvalidCredentialsError } = require('../errors/auth.errors');
const { assertNotLocked, registerFailedAttempt } = require('./passwordAttempts');
const { createSession } = require('./session.service');

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

  return createSession(user);
}

module.exports = { login };