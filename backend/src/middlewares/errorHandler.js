const { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError } = require('../errors/user.errors');
const { InvalidCredentialsError, AccountLockedError, UnauthorizedError } = require('../errors/auth.errors');
const { InvalidOrExpiredTokenError } = require('../errors/token.errors');
const { ProjectNotFoundError, FieldTooLongError, NoFieldsToUpdateError } = require('../errors/project.errors');

// Nota: valores vindos da requisição entram no log só com caracteres permitidos — evita forjar linhas (log injection)
function toLogSafe(value) {
  return String(value).replace(/[^\w\-/.:]/g, '_');
}

function errorHandler(err, req, res, next) {
  if (
    err instanceof WeakPasswordError ||
    err instanceof MissingFieldError ||
    err instanceof InvalidOrExpiredTokenError ||
    err instanceof FieldTooLongError ||
    err instanceof NoFieldsToUpdateError
  ) {
    return res.status(400).json({ message: err.message });
  }

  if (err instanceof InvalidCredentialsError) {
    return res.status(401).json({ message: err.message });
  }

  if (err instanceof UnauthorizedError) {
    return res.set('WWW-Authenticate', 'Bearer').status(401).json({ message: err.message });
  }

  if (err instanceof ProjectNotFoundError) {
    // Nota: registra erros de acesso (OWASP A09 - RFC 6.1) sem distinguir "inexistente" de "de outro usuário"
    console.warn(
      `Acesso a projeto não encontrado: ${toLogSafe(req.method)} ${toLogSafe(req.originalUrl)} (usuário ${toLogSafe(req.user?.id)})`
    );
    return res.status(404).json({ message: err.message });
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