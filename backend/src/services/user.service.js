const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const emailService = require('./email.service');
const { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError } = require('../errors/user.errors');
const { InvalidOrExpiredTokenError } = require('../errors/token.errors');

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 10;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;

function validatePasswordStrength(password) {
  if (!PASSWORD_REGEX.test(password || '')) {
    throw new WeakPasswordError();
  }
}

function generateVerificationToken(now) {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(now.getTime() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
  };
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
  const now = new Date();
  const { token: verificationToken, expiresAt: verificationTokenExpiresAt } = generateVerificationToken(now);

  const createdUser = await userRepository.create({
    name,
    email,
    passwordHash,
    verificationToken,
    verificationTokenExpiresAt,
    verificationSentAt: now,
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

async function resendVerificationEmail(email) {
  const user = await userRepository.findByEmail(email);

  // Nota: todos os casos terminam na mesma resposta genérica do Controller (anti-enumeração)
  if (!user || user.email_verified) {
    return;
  }

  // Nota: o candidato só é usado se o token atual tiver vencido — enquanto válido, o mesmo link é reenviado.
  // O repositório aplica o intervalo mínimo de forma atômica e devolve o token a enviar (ou null).
  const now = new Date();
  const candidate = generateVerificationToken(now);
  const notSentAfter = new Date(now.getTime() - VERIFICATION_RESEND_COOLDOWN_MS);

  const tokenToSend = await userRepository.claimVerificationResend(user.id, { ...candidate, now, notSentAfter });
  if (tokenToSend) {
    await emailService.sendVerificationEmail(email, tokenToSend);
  }
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

module.exports = { register, verifyEmail, resendVerificationEmail, requestPasswordReset, resetPassword };
