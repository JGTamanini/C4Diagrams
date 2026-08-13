const { EmailAlreadyExistsError, WeakPasswordError } = require('../errors/user.errors');

function errorHandler(err, req, res, next) {
  if (err instanceof WeakPasswordError) {
    return res.status(400).json({ message: err.message });
  }

  if (err instanceof EmailAlreadyExistsError) {
    return res.status(409).json({ message: err.message });
  }

  console.error('Erro não tratado:', err);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}

module.exports = errorHandler;