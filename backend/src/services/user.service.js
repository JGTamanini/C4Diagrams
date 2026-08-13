const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const { EmailAlreadyExistsError, WeakPasswordError } = require('../errors/user.errors');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const VERIFICATION_TOKEN_TTL_HOURS = 24;

async function register({ name, email, password }) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new WeakPasswordError();
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new EmailAlreadyExistsError(email);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  const createdUser = await userRepository.create({
    name,
    email,
    passwordHash,
    verificationToken,
    verificationTokenExpiresAt,
  });

  return createdUser;
}

module.exports = { register };