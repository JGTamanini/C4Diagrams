const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError } = require('../errors/user.errors');

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;

async function register({ name, email, password }) {
  if (!name) throw new MissingFieldError('name');
  if (!email) throw new MissingFieldError('email');
  if (!PASSWORD_REGEX.test(password || '')) {
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