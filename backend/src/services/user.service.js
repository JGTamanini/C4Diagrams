const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const emailService = require('./email.service');
const { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError } = require('../errors/user.errors');
const { InvalidOrExpiredTokenError } = require('../errors/token.errors');

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 10;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;

function validatePasswordStrength(password) {
  if (!PASSWORD_REGEX.test(password || '')) {
    throw new WeakPasswordError();
  }
}

async function register({ name, email, password }) {
  if (!name) throw new MissingFieldError('name');
  if (!email) throw new MissingFieldError('email');
  validatePasswordStrength(password);

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

async function requestPasswordReset(email) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    return; // resposta genérica no Controller, sem revelar se o e-mail existe
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await userRepository.setPasswordResetToken(user.id, resetToken, expiresAt);
  await emailService.sendPasswordResetEmail(email, resetToken);
}

async function resetPassword(token, newPassword) {
  const user = await userRepository.findByPasswordResetToken(token);

  if (!user) {
    throw new InvalidOrExpiredTokenError();
  }

  if (new Date(user.password_reset_token_expires_at) < Date.now()) {
    throw new InvalidOrExpiredTokenError();
  }

  validatePasswordStrength(newPassword);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepository.updatePassword(user.id, passwordHash);
}

module.exports = { register, verifyEmail, requestPasswordReset, resetPassword };
