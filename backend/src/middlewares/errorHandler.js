const { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError } = require('../errors/user.errors');
const {
  InvalidCredentialsError,
  AccountLockedError,
  UnauthorizedError,
  IncorrectPasswordError,
  EmailNotVerifiedError,
} = require('../errors/auth.errors');
const { InvalidOrExpiredTokenError } = require('../errors/token.errors');
const {
  ProjectNotFoundError,
  FieldTooLongError,
  NoFieldsToUpdateError,
  InvalidImportFileError,
  SharedProjectNotFoundError,
} = require('../errors/project.errors');
const {
  InvalidDiagramLevelError,
  InvalidDiagramDataError,
  DiagramVersionConflictError,
} = require('../errors/diagram.errors');
const {
  AiUnavailableError,
  AiDailyLimitError,
  AiGenerationError,
  InvalidSuggestionRequestError,
} = require('../errors/ai.errors');

// Nota: valores vindos da requisição entram no log só com caracteres permitidos — evita forjar linhas (log injection)
function toLogSafe(value) {
  return String(value).replace(/[^\w\-/.:]/g, '_');
}

function errorHandler(err, req, res, next) {
  // Corpo maior que o limite do parser de JSON (body-parser do Express)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'O conteúdo enviado é grande demais.' });
  }

  if (
    err instanceof WeakPasswordError ||
    err instanceof MissingFieldError ||
    err instanceof InvalidOrExpiredTokenError ||
    err instanceof FieldTooLongError ||
    err instanceof NoFieldsToUpdateError ||
    err instanceof InvalidDiagramLevelError ||
    err instanceof InvalidDiagramDataError ||
    err instanceof InvalidImportFileError ||
    err instanceof InvalidSuggestionRequestError
  ) {
    return res.status(400).json({ message: err.message });
  }

  if (err instanceof InvalidCredentialsError) {
    return res.status(401).json({ message: err.message });
  }

  if (err instanceof IncorrectPasswordError) {
    return res.status(403).json({ message: err.message });
  }

  // O código deixa a tela de login oferecer o reenvio do link de verificação
  if (err instanceof EmailNotVerifiedError) {
    return res.status(403).json({ message: err.message, code: err.code });
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

  // Issue #74: a versão atual vai junto, para a aba poder gravar por cima de propósito ("Manter a minha")
  if (err instanceof DiagramVersionConflictError) {
    return res.status(412).json({ message: err.message, currentVersion: err.currentVersion });
  }

  if (err instanceof SharedProjectNotFoundError) {
    return res.status(404).json({ message: err.message });
  }

  if (err instanceof EmailAlreadyExistsError) {
    return res.status(409).json({ message: err.message });
  }

  // RF16: limite diário (do usuário ou do sistema), falha da IA ao gerar e IA indisponível (sem chave ou créditos)
  if (err instanceof AiDailyLimitError) {
    return res.status(429).json({ message: err.message, scope: err.scope });
  }

  if (err instanceof AiGenerationError) {
    return res.status(502).json({ message: err.message });
  }

  if (err instanceof AiUnavailableError) {
    return res.status(503).json({ message: err.message });
  }

  if (err instanceof AccountLockedError) {
    return res.status(423).json({ message: err.message, minutesRemaining: err.minutesRemaining });
  }

  console.error('Erro não tratado:', err);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}

module.exports = errorHandler;