const { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError } = require('../errors/user.errors');
const { InvalidCredentialsError, AccountLockedError } = require('../errors/auth.errors');
const { InvalidOrExpiredTokenError } = require('../errors/token.errors');

function errorHandler(err, req, res, next) {
  if (err instanceof WeakPasswordError || err instanceof MissingFieldError || err instanceof InvalidOrExpiredTokenError) {
    return res.status(400).json({ message: err.message });
  }

  if (err instanceof InvalidCredentialsError) {
    return res.status(401).json({ message: err.message });
  }

  if (err instanceof EmailAlreadyExistsError) {
    return res.status(409).json({ message: err.message });
  }

  if (err instanceof AccountLockedError) {
    return res.status(423).json({ message: err.message, minutesRemaining: err.minutesRemaining });
  }

  console.error('Erro não tratado:', err);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}

module.exports = errorHandler;