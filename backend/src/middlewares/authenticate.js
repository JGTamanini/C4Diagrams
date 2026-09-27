const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../errors/auth.errors');

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

function authenticate(req, res, next) {
  const match = BEARER_PATTERN.exec(req.headers.authorization || '');

  if (!match) {
    return next(new UnauthorizedError('Autenticação necessária. Faça login para continuar.'));
  }

  try {
    const { id, email } = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id, email };
    return next();
  } catch (err) {
    if (!(err instanceof jwt.JsonWebTokenError)) {
      return next(err);
    }

    // Nota: loga só o tipo da falha, nunca o token (OWASP A09 - RFC 6.1)
    console.warn(`Falha de autenticação: ${err.name}`);
    return next(new UnauthorizedError('Sessão inválida ou expirada. Faça login novamente.'));
  }
}

module.exports = authenticate;
