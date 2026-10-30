const jwt = require('jsonwebtoken');

// Nota: cria a sessão (JWT) de um usuário já autenticado — usada pelo login e pela verificação de e-mail, que
// também entra na conta. Os dados sensíveis (hash, tokens, contador de tentativas) nunca saem para o cliente.
function createSession(user) {
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const {
    password_hash,
    failed_login_attempts,
    locked_until,
    verification_token,
    verification_token_expires_at,
    ...safeUser
  } = user;

  return { token, user: safeUser };
}

module.exports = { createSession };
