const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const { InvalidCredentialsError, EmailNotVerifiedError } = require('../errors/auth.errors');
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

  // Nota: exigir o e-mail confirmado só faz sentido quando os e-mails chegam a qualquer pessoa (domínio verificado no
  // Resend); por isso é ligado pela variável. Vem depois da senha: a senha errada não revela se a conta existe.
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.email_verified) {
    throw new EmailNotVerifiedError();
  }

  return createSession(user);
}

module.exports = { login };