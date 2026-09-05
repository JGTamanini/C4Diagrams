class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super('Token inválido ou expirado.');
    this.name = 'InvalidOrExpiredTokenError';
  }
}

module.exports = { InvalidOrExpiredTokenError };