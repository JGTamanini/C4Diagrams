const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const emailService = require('./email.service');
const { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError } = require('../errors/user.errors');
const { InvalidOrExpiredTokenError } = require('../errors/token.errors');

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

  await emailService.sendVerificationEmail(email, verificationToken);

  return createdUser;
}

async function verifyEmail(token) {
  const user = await userRepository.findByVerificationToken(token);

  if (!user) {
    throw new InvalidOrExpiredTokenError();
  }

  if (new Date(user.verification_token_expires_at) < Date.now()) {
    throw new InvalidOrExpiredTokenError();
  }

  await userRepository.markEmailAsVerified(user.id);
}

module.exports = { register, verifyEmail };