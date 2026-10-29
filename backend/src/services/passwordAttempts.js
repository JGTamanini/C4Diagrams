const userRepository = require('../repositories/user.repository');
const { AccountLockedError } = require('../errors/auth.errors');

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutos

// Nota: limite de senhas erradas (OWASP A07 — RFC 6.1), compartilhado por toda rota que confere a senha (login e
// excluir a conta). É o mesmo contador para as duas: alternar entre elas não contorna o bloqueio.
function assertNotLocked(user) {
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesRemaining = Math.ceil((new Date(user.locked_until) - Date.now()) / (60 * 1000));
    throw new AccountLockedError(minutesRemaining);
  }
}

async function registerFailedAttempt(userId) {
  const attempts = await userRepository.incrementFailedAttempts(userId);

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    await userRepository.lockAccount(userId, new Date(Date.now() + LOCKOUT_DURATION_MS));
  }
}

module.exports = { assertNotLocked, registerFailedAttempt };
